import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Hoisted mock for @google/genai
const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

import { POST } from '@/app/api/admin/parse-circular/route';
import { parseCircularWithGemini } from '@/lib/gemini/circular-parser';

describe('Admin Circular API & Server-Side Extraction Engine', () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
  });

  it('rejects unsupported file formats in multipart form upload', async () => {
    const formData = new FormData();
    const fakeFile = new File(['fake content'], 'circular.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('file', fakeFile);

    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only PDF documents');
  });

  it('rejects empty 0-byte PDF files in multipart upload', async () => {
    const formData = new FormData();
    const emptyPdf = new File([], 'empty.pdf', { type: 'application/pdf' });
    formData.append('file', emptyPdf);

    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('0 bytes');
  });

  it('rejects spoofed non-PDF files disguised with .pdf extension via magic bytes check', async () => {
    const formData = new FormData();
    const fakePdf = new File(['This is plain text spoofed as a PDF document'], 'spoofed.pdf', {
      type: 'application/pdf',
    });
    formData.append('file', fakePdf);

    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid file signature');
  });

  it('rejects base64 PDF payloads with invalid file signatures', async () => {
    const invalidBase64 = Buffer.from('Not a real PDF file header').toString('base64');
    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Pdf: invalidBase64, filename: 'corrupted.pdf' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid file signature');
  });

  it('accepts valid PDF magic bytes signature in multipart upload', async () => {
    const validPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const validPdf = new File([validPdfBytes], 'legit.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', validPdf);

    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('rejects JSON payloads missing both text and base64Pdf', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'test.pdf' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Either circular text or base64 PDF');
  });

  it('rejects oversized PDF files exceeding 5 MB in multipart upload with HTTP 413', async () => {
    // 5.5 MB payload with %PDF- header
    const largeBytes = new Uint8Array(Math.floor(5.5 * 1024 * 1024));
    largeBytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    const largeFile = new File([largeBytes], 'oversized.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', largeFile);

    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('exceeds the 5 MB limit');
  });

  it('rejects base64 PDF payloads exceeding 5 MB limit with HTTP 413', async () => {
    const largeBase64 = 'A'.repeat(7 * 1024 * 1024);
    const request = new NextRequest('http://localhost:3000/api/admin/parse-circular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Pdf: largeBase64, filename: 'oversized.pdf' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('exceeds 5 MB limit');
  });

  it('falls back gracefully to fallback parser when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;

    const sampleText = `NATIONAL INSTITUTE OF TECHNOLOGY
SUBJECT: Annual Autonomous AI & Robotics Hackathon 2026
Date: October 24, 2026
Venue: Turing Engineering Tower
Coordinator: Dr. Sarah Mitchell`;

    const result = await parseCircularWithGemini({
      text: sampleText,
      filename: 'sample.pdf',
    });

    expect(result.mode).toBe('fallback');
    expect(result.warnings?.[0]).toContain('GEMINI_API_KEY');
    expect(result.data.eventTitle).toBeDefined();
    expect(result.data.category).toBeDefined();
  });

  it('successfully executes genuine Gemini extraction path when mocked with valid credentials', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_api_key_for_test';

    const mockExtracted = {
      eventTitle: 'Inter-Collegiate Innovation Conclave 2026',
      date: 'November 15, 2026',
      time: '10:00 AM - 04:00 PM',
      venue: 'Grand University Auditorium',
      coordinator: 'Dean of Research & Innovation',
      category: 'Academic',
      summary: 'Annual research showcase featuring industry presentations and undergraduate capstones.',
      targetAudience: 'All Undergraduate Students',
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockExtracted),
    });

    const result = await parseCircularWithGemini({
      text: 'Mock document content for innovation conclave',
      filename: 'circular.pdf',
    });

    expect(result.mode).toBe('gemini');
    expect(result.modelUsed).toBe('gemini-2.5-flash');
    expect(result.data.eventTitle).toBe('Inter-Collegiate Innovation Conclave 2026');
    expect(result.data.category).toBe('Academic');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully when the Gemini API throws a rate limit or network error', async () => {
    process.env.GEMINI_API_KEY = 'mock_valid_api_key_for_test';

    mockGenerateContent.mockRejectedValueOnce(
      new Error('ResourceExhausted: Quota exceeded for model gemini-2.5-flash')
    );

    const result = await parseCircularWithGemini({
      text: 'Sample circular text under high load',
      filename: 'test.pdf',
    });

    expect(result.mode).toBe('fallback');
    expect(result.warnings?.[0]).toContain('Quota exceeded');
    expect(result.data.eventTitle).toBeDefined();
  });
});
