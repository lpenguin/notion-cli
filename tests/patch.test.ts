import { describe, it, expect } from 'vitest';
import { applyPatchOperation, isValidUnifiedDiff } from '../src/lib/patch.js';

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

    it('should replace from start to end of file with end=Infinity', () => {
      const result = applyPatchOperation(original, {
        mode: 'lines',
        start: 7,
        end: Infinity,
        content: '## New Section\n\nNew content.',
      });

      const lines = result.patched.split('\n');
      expect(lines[6]).toBe('## New Section');
      expect(lines[7]).toBe('');
      expect(lines[8]).toBe('New content.');
      expect(lines.length).toBe(9);
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

  describe('Unified diff', () => {
    it('should apply a valid unified diff', () => {
      const diff = [
        '--- a/file.md',
        '+++ b/file.md',
        '@@ -3,3 +3,3 @@',
        ' This is line 3.',
        '-This is line 4.',
        '+This is MODIFIED line 4.',
        ' This is line 5.',
      ].join('\n');

      const result = applyPatchOperation(original, {
        mode: 'diff',
        patch: diff,
      });

      expect(result.patched).toContain('This is MODIFIED line 4.');
      expect(result.linesChanged).toBeGreaterThan(0);
    });

    it('should throw on failed patch application', () => {
      const badDiff = [
        '--- a/file.md',
        '+++ b/file.md',
        '@@ -3,3 +3,3 @@',
        ' This line does not exist in the original.',
        '-Nonexistent line.',
        '+Replacement.',
        ' Also nonexistent.',
      ].join('\n');

      expect(() =>
        applyPatchOperation(original, { mode: 'diff', patch: badDiff }),
      ).toThrow('page content may have changed');
    });
  });

  describe('Append', () => {
    it('should append content to end', () => {
      const result = applyPatchOperation(original, {
        mode: 'append',
        content: '## Appended Section',
      });

      expect(result.patched).toContain('## Appended Section');
      expect(result.patched.indexOf('Content here.')).toBeLessThan(
        result.patched.indexOf('## Appended Section'),
      );
    });
  });

  describe('Prepend', () => {
    it('should prepend content to beginning', () => {
      const result = applyPatchOperation(original, {
        mode: 'prepend',
        content: '> Note: This is a draft.',
      });

      expect(result.patched.startsWith('> Note: This is a draft.')).toBe(true);
    });
  });

  describe('isValidUnifiedDiff', () => {
    it('should return true for valid diff', () => {
      const diff = '@@ -1,3 +1,3 @@\n line1\n-old\n+new\n line3';
      expect(isValidUnifiedDiff(diff)).toBe(true);
    });

    it('should return false for non-diff text', () => {
      expect(isValidUnifiedDiff('just some text')).toBe(false);
    });
  });
});
