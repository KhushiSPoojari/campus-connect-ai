import { describe, it, expect } from 'vitest';
import {
  extractedCircularSchema,
  cleanRawGeminiJson,
  validateCircularJson,
} from '@/lib/gemini/schema';

describe('Gemini Circular Zod Schema & Output Validation', () => {
  const validPayload = {
    eventTitle: 'Annual Autonomous AI & Robotics Hackathon 2026',
    date: 'October 24-25, 2026',
    time: '09:00 AM - 08:00 PM',
    venue: 'Turing Engineering Tower, 3rd Floor Lab Suite',
    coordinator: 'Dr. Sarah Mitchell & ACM Chapter',
    category: 'Workshop',
    summary: 'A 36-hour hackathon focused on autonomous systems, edge computing, and AI hardware.',
    targetAudience: 'All B.Tech & M.Tech Students',
  };

  it('successfully validates a well-formed Gemini JSON response', () => {
    const result = extractedCircularSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventTitle).toBe(validPayload.eventTitle);
      expect(result.data.category).toBe('Workshop');
    }
  });

  it('strips markdown code fences from raw Gemini responses', () => {
    const rawFenced = `\`\`\`json\n${JSON.stringify(validPayload, null, 2)}\n\`\`\``;
    const cleaned = cleanRawGeminiJson(rawFenced);
    expect(cleaned.startsWith('{')).toBe(true);
    expect(cleaned.endsWith('}')).toBe(true);

    const validation = validateCircularJson(rawFenced);
    expect(validation.success).toBe(true);
    expect(validation.data?.eventTitle).toBe(validPayload.eventTitle);
  });

  it('rejects payloads with missing mandatory fields', () => {
    const missingTitle = { ...validPayload, eventTitle: undefined };
    const missingDate = { ...validPayload, date: '' };
    const missingSummary = { ...validPayload, summary: undefined };

    expect(extractedCircularSchema.safeParse(missingTitle).success).toBe(false);
    expect(extractedCircularSchema.safeParse(missingDate).success).toBe(false);
    expect(extractedCircularSchema.safeParse(missingSummary).success).toBe(false);
  });

  it('rejects invalid event categories outside the approved enum', () => {
    const invalidCategory = { ...validPayload, category: 'UnapprovedCategory' };
    const result = extractedCircularSchema.safeParse(invalidCategory);
    expect(result.success).toBe(false);
  });

  it('rejects titles and summaries that violate minimum length constraints', () => {
    const shortTitle = { ...validPayload, eventTitle: 'AI' }; // min 3
    const shortSummary = { ...validPayload, summary: 'Too short' }; // min 10

    expect(extractedCircularSchema.safeParse(shortTitle).success).toBe(false);
    expect(extractedCircularSchema.safeParse(shortSummary).success).toBe(false);
  });

  it('handles malformed JSON syntax gracefully without throwing', () => {
    const malformed = '{ eventTitle: "Broken JSON without quotes, ';
    const validation = validateCircularJson(malformed);
    expect(validation.success).toBe(false);
    expect(validation.errors?.[0]).toContain('Malformed JSON syntax');
  });

  it('handles empty or non-string inputs safely', () => {
    expect(validateCircularJson('')).toEqual({
      success: false,
      errors: ['Empty response received from extraction engine'],
    });
    // @ts-expect-error test non-string
    expect(validateCircularJson(null)).toEqual({
      success: false,
      errors: ['Empty response received from extraction engine'],
    });
  });
});
