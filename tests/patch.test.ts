import { describe, it, expect } from 'vitest';
import { applyPatchOperation } from '../src/lib/patch.js';

describe('Patch Engine', () => {
  const original = [
    '# Hello World',
    '',
    'This is line 3.',
    'This is line 4.',
    'This is line 5.',
    '',
    '## Section Two',
    '',
    'Content here.',
  ].join('\n');

  describe('Line-range replacement', () => {
    it('should replace a range of lines', () => {
      const result = applyPatchOperation(original, {
        mode: 'lines',
        start: 3,
        end: 5,
        content: 'Replaced line 3.\nReplaced line 4.',
      });

      const lines = result.patched.split('\n');
      expect(lines[2]).toBe('Replaced line 3.');
      expect(lines[3]).toBe('Replaced line 4.');
      expect(lines[4]).toBe(''); // was line 6 in original
      expect(result.linesChanged).toBeGreaterThan(0);
    });

    it('should replace a single line', () => {
      const result = applyPatchOperation(original, {
        mode: 'lines',
        start: 3,
        end: 3,
        content: 'New line 3.',
      });

      const lines = result.patched.split('\n');
      expect(lines[2]).toBe('New line 3.');
      expect(lines[3]).toBe('This is line 4.');
    });

    it('should delete lines when content is empty', () => {
      const result = applyPatchOperation(original, {
        mode: 'lines',
        start: 3,
        end: 5,
        content: '',
      });

      const lines = result.patched.split('\n');
      expect(lines.length).toBe(original.split('\n').length - 3);
    });

    it('should throw for start line < 1', () => {
      expect(() =>
        applyPatchOperation(original, {
          mode: 'lines',
          start: 0,
          end: 3,
          content: 'test',
        }),
      ).toThrow('start must be >= 1');
    });
  });
});
