/**
 * notion-cli page write-properties <page-id> --json-data <json> | --file <file.json>
 *
 * Update a Notion page's properties from a JSON object.
 * Only the properties present in the JSON are updated; all others remain unchanged.
 * Merge strategy: existing page properties as base, JSON values overwrite.
 *
 * The JSON must be a flat object mapping property names to string values.
 * Provide properties via --json-data (inline JSON string) or --file (path to a JSON file).
 *
 * This command is NOT idempotent (applies updates each run).
 */

import { type Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getClient, resolveDataSourceId } from '../../lib/client.js';
import { buildNotionProperties } from '../../lib/db-properties.js';
import { printSuccess, printError, isJsonMode } from '../../lib/output.js';
import { isDryRun } from '../../lib/safety.js';
import { withRateLimit } from '../../lib/rate-limit.js';
import { parseNotionId } from '../../utils/id.js';
import { type GlobalOptions } from '../../lib/types.js';
import { toCliError, ValidationError } from '../../lib/errors.js';
import * as logger from '../../utils/logger.js';
import { isFullPage, type UpdatePageParameters, type PageObjectResponse } from '@notionhq/client';

interface WritePropertiesOptions {
  jsonData?: string;
  file?: string;
}

function parseJsonProperties(opts: WritePropertiesOptions): Record<string, string> {
  if (opts.jsonData !== undefined && opts.file !== undefined) {
    throw new ValidationError('Provide either --json-data or --file, not both.');
  }
  if (opts.jsonData === undefined && opts.file === undefined) {
    throw new ValidationError('One of --json-data or --file is required.');
  }

  let raw: string;
  if (opts.file !== undefined) {
    raw = readFileSync(opts.file, 'utf-8');
  } else {
    raw = opts.jsonData as string;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError('Invalid JSON: could not parse property data.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ValidationError('JSON property data must be a flat object mapping property names to string values.');
  }

  const record = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') {
      throw new ValidationError(`Property "${key}" must have a string value.`);
    }
  }

  return record as Record<string, string>;
}

export function registerPageWritePropertiesCommand(page: Command): void {
  page
    .command('write-properties')
    .description('Update a Notion page properties from a JSON object. Only specified properties are changed.')
    .argument('<page-id>', 'Notion page ID or URL')
    .option('--json-data <json>', 'JSON string mapping property names to string values')
    .option('-f, --file <path>', 'Path to a JSON file mapping property names to string values')
    .action(async (rawId: string, cmdOpts: WritePropertiesOptions) => {
      try {
        const opts = page.optsWithGlobals<GlobalOptions>();
        const pageId = parseNotionId(rawId);
        const client = getClient(opts.token);

        const jsonProps = parseJsonProperties(cmdOpts);

        // Retrieve page to find parent database for schema
        const pageResponse = await withRateLimit(
          () => client.pages.retrieve({ page_id: pageId }),
          'pages.retrieve',
        );

        if (!isFullPage(pageResponse)) {
          throw new ValidationError('Could not retrieve full page object.');
        }

        // Get parent database ID for schema lookup
        const parent = pageResponse.parent;
        if (parent.type !== 'database_id') {
          throw new ValidationError('Page does not belong to a database; cannot resolve property schema.');
        }

        const dbId = await resolveDataSourceId(client, parent.database_id);

        const dataSource = await withRateLimit(
          // @ts-ignore - dataSources might be new in the SDK
          () => client.dataSources.retrieve({ data_source_id: dbId }),
          'dataSources.retrieve',
        );
        const schemaProps = dataSource.properties;

        const jsonProperties = buildNotionProperties(jsonProps, schemaProps);

        // Merge: existing properties as base, JSON values overwrite
        const existingProperties: PageObjectResponse['properties'] = pageResponse.properties;
        const mergedProperties: Record<string, unknown> = {
          ...existingProperties,
          ...jsonProperties,
        };

        logger.debug(`Updating ${String(Object.keys(jsonProperties).length)} properties on page ${pageId}.`);

        if (isDryRun(opts.dryRun)) {
          if (isJsonMode()) {
            printSuccess({
              pageId,
              properties: Object.keys(jsonProperties),
              dryRun: true,
            });
          } else {
            logger.info(
              `Dry run: Would update properties [${Object.keys(jsonProperties).join(', ')}] on page ${pageId}.`,
            );
          }
          return;
        }

        await withRateLimit(
          () =>
            client.pages.update({
              page_id: pageId,
              properties: mergedProperties as UpdatePageParameters['properties'],
            }),
          'pages.update',
        );

        const result = {
          pageId,
          properties: Object.keys(jsonProperties),
        };

        if (isJsonMode()) {
          printSuccess(result);
        } else {
          logger.success(
            `Updated properties [${Object.keys(jsonProperties).join(', ')}] on page ${pageId}.`,
          );
        }
      } catch (err) {
        const cliErr = toCliError(err);
        printError(cliErr.code, cliErr.message);
        process.exitCode = cliErr.exitCode;
      }
    });
}
