import { describe, it, expect } from 'vitest';
import { parseNotionId } from '../src/utils/id.js';

describe('Notion ID Parsing', () => {
  it('should parse a dashed UUID', () => {
    const id = parseNotionId('12345678-1234-1234-1234-123456789abc');
    expect(id).toBe('12345678-1234-1234-1234-123456789abc');
  });

  it('should parse an undashed UUID', () => {
    const id = parseNotionId('123456781234123412341234567890ab');
    expect(id).toBe('12345678-1234-1234-1234-1234567890ab');
  });

  it('should extract ID from a Notion URL', () => {
    const id = parseNotionId(
      'https://www.notion.so/My-Page-Title-123456781234123412341234567890ab',
    );
    expect(id).toBe('12345678-1234-1234-1234-1234567890ab');
  });

  it('should extract dashed UUID from a URL', () => {
    const id = parseNotionId(
      'https://notion.so/workspace/12345678-1234-1234-1234-123456789abc?v=xxx',
    );
    expect(id).toBe('12345678-1234-1234-1234-123456789abc');
  });

  it('should throw for invalid input', () => {
    expect(() => parseNotionId('not-a-valid-id')).toThrow('Invalid Notion ID');
  });

  it('should throw for empty string', () => {
    expect(() => parseNotionId('')).toThrow('Invalid Notion ID');
  });
});
