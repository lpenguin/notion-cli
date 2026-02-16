/**
 * Notion API client singleton with token resolution.
 */

import { Client } from '@notionhq/client';
import { resolveToken } from './config.js';
import * as logger from '../utils/logger.js';
import type { GetDataSourceResponse } from '@notionhq/client/build/src/api-endpoints.js';

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

/**
 * Resolve a database ID to its primary data source ID.
 * In the new Notion API (2025-09-03+), we must query data sources, not databases directly.
 */
export async function resolveDataSourceId(client: Client, dbId: string): Promise<string> {
  try {
    // We attempt to retrieve as a database first
    const db = await client.databases.retrieve({ database_id: dbId });
    
    // Check if it's already a data source object or a database with data sources
    if ((db as any).object === 'data_source') {
      return (db as any).id;
    }
    
    const dbWithSources = db as any;
    if (dbWithSources.data_sources && dbWithSources.data_sources.length > 0) {
      return dbWithSources.data_sources[0].id;
    }
  } catch (err: any) {
    // If retrieve fails with 404, it might already be a data_source ID (which databases.retrieve won't find)
    if (err.code === 'object_not_found') {
      try {
        const ds = await (client as any).dataSources.retrieve({ data_source_id: dbId }) as GetDataSourceResponse;
        if (ds.object === 'data_source') {
          return ds.id;
        }
      } catch (innerErr) {
        // Fallback to original ID if all else fails
        return dbId;
      }
    }
    throw err;
  }
  return dbId;
}

/** Reset client (useful for testing). */
export function resetClient(): void {
  clientInstance = undefined;
}
