/**
 * notion-cli page write-properties <page-id> --file <file.csv>
 *
 * Update a Notion page's properties from a single CSV row.
 * Only the properties present in the CSV are updated; all others remain unchanged.
 * Merge strategy: existing page properties as base, CSV values overwrite.
 *
 * The CSV must have a header row with property names.
 * The _notion_id column is ignored if present.
 *
 * This command is NOT idempotent (applies updates each run).
 */

import { type Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getClient, resolveDataSourceId } from '../../lib/client.js';
import { csvToRows } from '../../lib/csv.js';
import { buildNotionProperties } from '../../lib/db-properties.js';
import { printSuccess, printError, isJsonMode } from '../../lib/output.js';
import { isDryRun } from '../../lib/safety.js';
import { withRateLimit } from '../../lib/rate-limit.js';
import { parseNotionId } from '../../utils/id.js';
import { type GlobalOptions } from '../../lib/types.js';
import { toCliError, ValidationError } from '../../lib/errors.js';
import * as logger from '../../utils/logger.js';
import { isFullPage, type UpdatePageParameters, type PageObjectResponse } from '@notionhq/client';

export function registerPageWritePropertiesCommand(page: Command): void {
  page
    .command('write-properties')
    .description('Update a Notion page properties from a CSV row. Only specified properties are changed.')
    .argument('<page-id>', 'Notion page ID or URL')
    .requiredOption('-f, --file <path>', 'Path to CSV file with property values')
    .action(async (rawId: string, cmdOpts: { file: string }) => {
      try {
        const opts = page.optsWithGlobals<GlobalOptions>();
        const pageId = parseNotionId(rawId);
        const client = getClient(opts.token);

        const csvContent = readFileSync(cmdOpts.file, 'utf-8');
        const rows = csvToRows(csvContent);

        if (rows.length === 0) {
          throw new ValidationError('CSV file contains no data rows.');
        }
        if (rows.length > 1) {
          throw new ValidationError('CSV file must contain exactly one data row for page write-properties.');
        }

        const row = rows[0];
        if (row === undefined) {
          throw new ValidationError('CSV file contains no data rows.');
        }

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

        const csvProperties = buildNotionProperties(row.properties, schemaProps);

        // Merge: existing properties as base, CSV values overwrite
        const existingProperties: PageObjectResponse['properties'] = pageResponse.properties;
        const mergedProperties: Record<string, unknown> = {
          ...existingProperties,
          ...csvProperties,
        };

        logger.debug(`Updating ${String(Object.keys(csvProperties).length)} properties on page ${pageId}.`);

        if (isDryRun(opts.dryRun)) {
          if (isJsonMode()) {
            printSuccess({
              pageId,
              properties: Object.keys(csvProperties),
              dryRun: true,
            });
          } else {
            logger.info(
              `Dry run: Would update properties [${Object.keys(csvProperties).join(', ')}] on page ${pageId}.`,
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
          properties: Object.keys(csvProperties),
        };

        if (isJsonMode()) {
          printSuccess(result);
        } else {
          logger.success(
            `Updated properties [${Object.keys(csvProperties).join(', ')}] on page ${pageId}.`,
          );
        }
      } catch (err) {
        const cliErr = toCliError(err);
        printError(cliErr.code, cliErr.message);
        process.exitCode = cliErr.exitCode;
      }
    });
}
