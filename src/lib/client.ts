/**
 * Notion API client singleton with token resolution.
 */

import { Client } from '@notionhq/client';
import { resolveToken } from './config.js';
import * as logger from '../utils/logger.js';

let clientInstance: Client | undefined;

/**
 * Get or create the Notion API client.
 * Token is resolved from CLI flag → env → config file.
 */
export function getClient(cliToken?: string): Client {
  if (clientInstance !== undefined) {
    return clientInstance;
  }

  const token = resolveToken(cliToken);
  logger.debug('Initializing Notion API client.');

  clientInstance = new Client({
    auth: token,
    timeoutMs: 30_000,
  });

  return clientInstance;
}

/** Reset client (useful for testing). */
export function resetClient(): void {
  clientInstance = undefined;
}
