/**
 * Notion ID parsing, validation, and extraction utilities.
 */

import { notionIdSchema, normalizeId } from '../lib/validator.js';
import { ValidationError } from '../lib/errors.js';

/**
 * Parse and validate a Notion ID from user input.
 * Accepts:
 * - Raw UUIDs (with or without dashes)
 * - Notion URLs (https://notion.so/page-title-abc123...)
 * - Notion API IDs
 *
 * Returns a normalized dashed UUID.
 */
export function parseNotionId(input: string): string {
  // Try to extract ID from a Notion URL
  const urlMatch = /([a-f0-9]{32})(?:\?|$)/i.exec(input);
  if (urlMatch?.[1] !== undefined) {
    return normalizeId(urlMatch[1]);
  }

  // Try to extract dashed UUID from URL path
  const dashedMatch =
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i.exec(input);
  if (dashedMatch?.[1] !== undefined) {
    return normalizeId(dashedMatch[1]);
  }

  // Validate as raw ID
  const result = notionIdSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(`Invalid Notion ID: "${input}". Expected a UUID or Notion URL.`);
  }

  return normalizeId(result.data);
}
