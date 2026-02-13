import { describe, it, expect } from 'vitest';
import { addLineNumbers, stripLineNumbers, extractTitle } from '../src/lib/markdown.js';

describe('Markdown Utilities', () => {
  describe('addLineNumbers', () => {
    it('should add 1-based line numbers', () => {
      const input = 'line one\nline two\nline three';
      const result = addLineNumbers(input);
      expect(result).toBe('1: line one\n2: line two\n3: line three');
    });

    it('should pad line numbers for alignment', () => {
      const lines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join('\n');
      const result = addLineNumbers(lines);
      expect(result).toContain(' 1: line 1');
      expect(result).toContain('12: line 12');
    });
  });

  describe('stripLineNumbers', () => {
    it('should remove line number prefixes', () => {
      const input = '1: line one\n2: line two\n3: line three';
      const result = stripLineNumbers(input);
      expect(result).toBe('line one\nline two\nline three');
    });

    it('should handle padded line numbers', () => {
      const input = ' 1: line one\n10: line ten';
      const result = stripLineNumbers(input);
      expect(result).toBe('line one\nline ten');
    });
  });

  describe('extractTitle', () => {
    it('should extract H1 title', () => {
      const md = '# My Page Title\n\nSome content.';
      expect(extractTitle(md)).toBe('My Page Title');
    });

    it('should return "Untitled" when no H1 found', () => {
      const md = 'Just some text without a heading.';
      expect(extractTitle(md)).toBe('Untitled');
    });

    it('should extract the first H1 only', () => {
      const md = '# First Title\n\n# Second Title';
      expect(extractTitle(md)).toBe('First Title');
    });
  });
});
