/**
 * Markdown conversion wrappers.
 *
 * - Markdown → Notion blocks: @tryfabric/martian
 * - Notion → Markdown: notion-to-md
 *
 * This module provides a clean interface over both libraries.
 */

import { markdownToBlocks } from '@tryfabric/martian';
import { NotionToMarkdown } from 'notion-to-md';
import { type Client } from '@notionhq/client';
import { type BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints.js';
import * as logger from '../utils/logger.js';

/**
 * Convert a Markdown string to an array of Notion block objects.
 * Uses @tryfabric/martian for the conversion.
 */
export function markdownToNotionBlocks(markdown: string): BlockObjectRequest[] {
  logger.debug(`Converting ${String(markdown.length)} chars of Markdown to Notion blocks.`);

  const blocks = markdownToBlocks(markdown) as BlockObjectRequest[];

  logger.debug(`Produced ${String(blocks.length)} Notion blocks.`);
  return blocks;
}

/**
 * Fetch a Notion page's content and convert to Markdown.
 * Uses notion-to-md for the conversion.
 */
export async function notionPageToMarkdown(
  client: Client,
  pageId: string,
): Promise<string> {
  logger.debug(`Fetching page ${pageId} and converting to Markdown.`);

  const n2m = new NotionToMarkdown({ notionClient: client });
  const blocks = await n2m.pageToMarkdown(pageId);
  const markdown = n2m.toMarkdownString(blocks);

  // notion-to-md v3 returns { parent: string } object
  const result = typeof markdown === 'string' ? markdown : markdown.parent;
  const output = result ?? '';

  logger.debug(`Converted page to ${String(output.length)} chars of Markdown.`);
  return output;
}

/**
 * Convert Markdown to numbered-line format for patch operations.
 * Each line is prefixed with its 1-based line number.
 *
 * Example output:
 *   1: # Hello World
 *   2:
 *   3: Some content here.
 */
export function addLineNumbers(markdown: string): string {
  const lines = markdown.split('\n');
  const padWidth = String(lines.length).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(padWidth)}: ${line}`)
    .join('\n');
}

/**
 * Remove line numbers from numbered-line format.
 * Strips the "N: " prefix from each line.
 */
export function stripLineNumbers(numbered: string): string {
  return numbered
    .split('\n')
    .map((line) => line.replace(/^\s*\d+:\s?/, ''))
    .join('\n');
}

/**
 * Extract the title (first H1) from Markdown content.
 */
export function extractTitle(markdown: string): string {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match?.[1]?.trim() ?? 'Untitled';
}
