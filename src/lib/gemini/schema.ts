
import { z } from 'zod';
import type { EventCategory, ExtractedCircularData } from '@/types/event';

export const EVENT_CATEGORIES: [EventCategory, ...EventCategory[]] = [
  'Academic',
  'Workshop',
  'Cultural',
  'Sports',
  'Placement',
  'Administrative',
];

/**
 * Zod validation schema for structured circular extraction from Google Gemini.
 */
export const extractedCircularSchema = z.object({
  eventTitle: z
    .string()
    .min(3, 'Event title must be at least 3 characters long')
    .max(200, 'Event title cannot exceed 200 characters'),

  date: z
    .string()
    .min(4, 'Event date or date range is required')
    .max(100, 'Date description cannot exceed 100 characters'),

  time: z
    .string()
    .max(100, 'Time description cannot exceed 100 characters')
    .optional()
    .default(''),

  venue: z
    .string()
    .min(2, 'Venue is required')
    .max(200, 'Venue cannot exceed 200 characters'),

  coordinator: z
    .string()
    .min(2, 'Coordinator or organizing body is required')
    .max(150, 'Coordinator cannot exceed 150 characters'),

  category: z.enum(EVENT_CATEGORIES, {
    message:
      'Category must be one of Academic, Workshop, Cultural, Sports, Placement, or Administrative',
  }),

  summary: z
    .string()
    .min(10, 'Summary must be at least 10 characters long')
    .max(1000, 'Summary cannot exceed 1000 characters'),

  targetAudience: z
    .string()
    .max(150, 'Target audience cannot exceed 150 characters')
    .optional()
    .default('All Campus Students & Faculty'),
});

export type ValidatedCircularData = z.infer<
  typeof extractedCircularSchema
>;

/**
 * Strips Markdown code fences (```json ... ```) or whitespace
 * from raw Gemini output.
 */
export function cleanRawGeminiJson(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let cleaned = rawText.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```\s*$/, '');
  }

  return cleaned.trim();
}

/**
 * Safely parses and validates circular JSON against the Zod schema.
 */
export function validateCircularJson(rawText: string): {
  success: boolean;
  data?: ExtractedCircularData;
  errors?: string[];
} {
  const cleaned = cleanRawGeminiJson(rawText);

  if (!cleaned) {
    return {
      success: false,
      errors: ['Empty response received from extraction engine'],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    return {
      success: false,
      errors: [
        `Malformed JSON syntax: ${
          err instanceof Error ? err.message : 'Invalid JSON format'
        }`,
      ],
    };
  }

  const result = extractedCircularSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessages = result.error.issues.map(
      (issue) =>
        `${issue.path.join('.') || 'field'}: ${issue.message}`,
    );

    return {
      success: false,
      errors: errorMessages,
    };
  }

  return {
    success: true,
    data: result.data as ExtractedCircularData,
  };
}