import { describe, it, expect } from 'vitest';
import { lineRangeSchema, notionIdSchema } from '../src/lib/validator.js';

describe('Validators', () => {
  describe('notionIdSchema', () => {
    it('should accept dashed UUID', () => {
      const result = notionIdSchema.safeParse('12345678-1234-1234-1234-123456789abc');
      expect(result.success).toBe(true);
    });

    it('should accept undashed UUID', () => {
      const result = notionIdSchema.safeParse('12345678123412341234123456789abc');
      expect(result.success).toBe(true);
    });

    it('should reject invalid IDs', () => {
      const result = notionIdSchema.safeParse('not-valid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = notionIdSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('lineRangeSchema', () => {
    it('should parse "5:12"', () => {
      const result = lineRangeSchema.safeParse('5:12');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start).toBe(5);
        expect(result.data.end).toBe(12);
      }
    });

    it('should parse "192:256"', () => {
      const result = lineRangeSchema.safeParse('192:256');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start).toBe(192);
        expect(result.data.end).toBe(256);
      }
    });

    it('should reject "5:" (missing end)', () => {
      const result = lineRangeSchema.safeParse('5:');
      expect(result.success).toBe(false);
    });

    it('should reject ":256" (missing start)', () => {
      const result = lineRangeSchema.safeParse(':256');
      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = lineRangeSchema.safeParse('abc:def');
      expect(result.success).toBe(false);
    });

    it('should reject start of 0 (must be >= 1)', () => {
      const result = lineRangeSchema.safeParse('0:5');
      expect(result.success).toBe(false);
    });
  });
});
