import { NextRequest, NextResponse } from 'next/server';
import { parseCircularWithGemini } from '@/lib/gemini/circular-parser';
import { requireAdmin } from '@/lib/auth/server-auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if ('errorResponse' in authResult) {
      return authResult.errorResponse;
    }

    const contentType = request.headers.get('content-type') || '';

    let text: string | undefined;
    let base64Pdf: string | undefined;
    let filename: string | undefined;
    let mimeType = 'application/pdf';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { success: false, error: 'No document file provided in request.' },
          { status: 400 }
        );
      }

      filename = file.name;

      // Validate file extension
      if (!filename.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unsupported file format. Only PDF documents (.pdf) are permitted.',
          },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File size exceeds the 5 MB limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
          },
          { status: 413 }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { success: false, error: 'The uploaded PDF file is empty (0 bytes).' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Validate PDF magic bytes signature (%PDF-)
      const magicBytes = buffer.subarray(0, 5).toString('utf8');
      if (magicBytes !== '%PDF-') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid file signature: uploaded file is not a valid PDF document.',
          },
          { status: 400 }
        );
      }

      base64Pdf = buffer.toString('base64');
      mimeType = file.type || 'application/pdf';

      // Check if text payload was also provided in formData
      const textParam = formData.get('text');
      if (typeof textParam === 'string' && textParam.trim()) {
        text = textParam.trim();
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();

      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON request payload.' },
          { status: 400 }
        );
      }

      text = body.text;
      base64Pdf = body.base64Pdf;
      filename = body.filename;
      if (body.mimeType) mimeType = body.mimeType;

      if (!text && !base64Pdf) {
        return NextResponse.json(
          {
            success: false,
            error: 'Either circular text or base64 PDF document must be provided.',
          },
          { status: 400 }
        );
      }

      // Check base64 size and magic bytes if provided
      if (base64Pdf) {
        const approxSize = Math.ceil((base64Pdf.length * 3) / 4);
        if (approxSize > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: 'Base64 PDF payload exceeds 5 MB limit.' },
            { status: 413 }
          );
        }

        const buffer = Buffer.from(base64Pdf, 'base64');
        const magicBytes = buffer.subarray(0, 5).toString('utf8');
        if (magicBytes !== '%PDF-') {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid file signature: uploaded file is not a valid PDF document.',
            },
            { status: 400 }
          );
        }
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Content-Type must be multipart/form-data or application/json.',
        },
        { status: 415 }
      );
    }

    // Process server-side with Google Gemini
    const result = await parseCircularWithGemini({
      text,
      base64Pdf,
      filename,
      mimeType,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      mode: result.mode,
      modelUsed: result.modelUsed,
      warnings: result.warnings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: `Circular extraction failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
