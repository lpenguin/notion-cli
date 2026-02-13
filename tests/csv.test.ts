import { describe, it, expect } from 'vitest';
import { csvToRows, rowsToCsv } from '../src/lib/csv.js';

describe('CSV Utilities', () => {
  describe('rowsToCsv', () => {
    it('should generate CSV with headers', () => {
      const rows = [
        {
          id: 'abc-123',
          properties: {
            Name: { type: 'title', title: [{ plain_text: 'Test Task' }] },
            Status: { type: 'select', select: { name: 'In Progress' } },
          },
        },
      ];

      const csv = rowsToCsv(rows, ['Name', 'Status']);
      expect(csv).toContain('_notion_id');
      expect(csv).toContain('Name');
      expect(csv).toContain('Status');
      expect(csv).toContain('abc-123');
      expect(csv).toContain('Test Task');
      expect(csv).toContain('In Progress');
    });

    it('should handle empty results', () => {
      const csv = rowsToCsv([], ['Name']);
      expect(csv).toContain('_notion_id');
      expect(csv).toContain('Name');
    });
  });

  describe('csvToRows', () => {
    it('should parse CSV with _notion_id', () => {
      const csv = '_notion_id,Name,Status\nabc-123,Test Task,Done\n';
      const rows = csvToRows(csv);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe('abc-123');
      expect(rows[0]?.properties['Name']).toBe('Test Task');
      expect(rows[0]?.properties['Status']).toBe('Done');
    });

    it('should handle rows without _notion_id (for creation)', () => {
      const csv = '_notion_id,Name,Status\n,New Task,Todo\n';
      const rows = csvToRows(csv);

      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBeUndefined();
      expect(rows[0]?.properties['Name']).toBe('New Task');
    });

    it('should skip empty lines', () => {
      const csv = '_notion_id,Name\nabc,Task 1\n\ndef,Task 2\n';
      const rows = csvToRows(csv);
      expect(rows).toHaveLength(2);
    });
  });
});
