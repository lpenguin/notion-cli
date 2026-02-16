/**
 * Zod schemas for input validation.
 * All user inputs are validated before hitting the Notion API.
 */

import { z } from 'zod';

/** Notion ID: UUID with or without dashes (32 hex chars). */
const NOTION_ID_REGEX = /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i;

export const notionIdSchema = z
  .string()
  .regex(NOTION_ID_REGEX, 'Invalid Notion ID. Expected a UUID (32 hex characters).');

/** Normalize a Notion ID to dashed UUID format. */
export function normalizeId(id: string): string {
  const clean = id.replace(/-/g, '');
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20, 32),
  ].join('-');
}

/** Notion token: must start with ntn_ or secret_. */
export const tokenSchema = z
  .string()
  .min(1, 'Token cannot be empty.')
  .refine(
    (t) => t.startsWith('ntn_') || t.startsWith('secret_'),
    'Token must start with "ntn_" or "secret_".',
  );

/** Line range: "START:END" where both are positive integers. */
export const lineRangeSchema = z
  .string()
  .regex(/^\d+:\d+$/, 'Line range must be in format START:END (e.g., "192:256"). Both start and end are required.')
  .transform((val) => {
    const [startStr, endStr] = val.split(':');
    const start = parseInt(startStr ?? '0', 10);
    const end = parseInt(endStr ?? '0', 10);
    return { start, end };
  })
  .refine((r) => r.start >= 1, 'Start line must be >= 1.')
  .refine((r) => r.end >= 1, 'End line must be >= 1.')
  .refine((r) => r.end >= r.start, 'End line must be >= start line.');

/** Search query: non-empty string, max 100 chars. */
export const searchQuerySchema = z
  .string()
  .min(1, 'Search query cannot be empty.')
  .max(100, 'Search query must be <= 100 characters.');

/** Limit: positive integer, max 100. */
export const limitSchema = z
  .number()
  .int()
  .min(1, 'Limit must be >= 1.')
  .max(100, 'Limit must be <= 100.');

/** File path: non-empty string. */
export const filePathSchema = z
  .string()
  .min(1, 'File path cannot be empty.');

/** JSON filter/sort string: must parse as valid JSON. */
export const jsonStringSchema = z
  .string()
  .refine(
    (s) => {
      try {
        JSON.parse(s);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid JSON string.',
  )
  .transform((s) => JSON.parse(s) as unknown);
