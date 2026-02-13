/**
 * notion-cli block delete <block-id>
 *
 * Delete a Notion block by ID.
 *
 * Safety: Requires confirmation unless --yes is passed.
 * This is a DESTRUCTIVE operation that cannot be undone via the API.
 */

import { type Command } from 'commander';
import { getClient } from '../../lib/client.js';
import { printSuccess, printError } from '../../lib/output.js';
import { confirmAction, isDryRun } from '../../lib/safety.js';
import { withRetry } from '../../lib/rate-limit.js';
import { parseNotionId } from '../../utils/id.js';
import { type GlobalOptions } from '../../lib/types.js';
import { toCliError } from '../../lib/errors.js';
import * as logger from '../../utils/logger.js';

export function registerBlockDeleteCommand(block: Command): void {
  block
    .command('delete')
    .description('Delete a Notion block. This cannot be undone via the API.')
    .argument('<block-id>', 'Notion block ID')
    .action(async (rawId: string) => {
      try {
        const opts = block.optsWithGlobals<GlobalOptions>();
        const blockId = parseNotionId(rawId);
        const client = getClient(opts.token);

        if (isDryRun(opts.dryRun)) {
          printSuccess({ blockId, deleted: false, dryRun: true });
          return;
        }

        const confirmed = await confirmAction(
          `Delete block ${blockId}? This CANNOT be undone.`,
          opts.yes === true,
        );
        if (!confirmed) {
          logger.info('Aborted.');
          return;
        }

        await withRetry(
          () => client.blocks.delete({ block_id: blockId }),
          'blocks.delete',
        );

        printSuccess({ blockId, deleted: true });
        logger.success(`Deleted block ${blockId}.`);
      } catch (err) {
        const cliErr = toCliError(err);
        printError(cliErr.code, cliErr.message);
        process.exitCode = cliErr.exitCode;
      }
    });
}
