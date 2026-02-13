/**
 * notion-cli block list <block-id>
 *
 * List child blocks of a Notion block or page.
 * Outputs as Markdown (default) or JSON (--json).
 *
 * This command is idempotent and read-only.
 */

import { type Command } from 'commander';
import { getClient } from '../../lib/client.js';
import { notionPageToMarkdown, addLineNumbers } from '../../lib/markdown.js';
import { printSuccess, printError, isJsonMode } from '../../lib/output.js';
import { withRetry } from '../../lib/rate-limit.js';
import { parseNotionId } from '../../utils/id.js';
import { type GlobalOptions } from '../../lib/types.js';
import { toCliError } from '../../lib/errors.js';

export function registerBlockListCommand(block: Command): void {
  block
    .command('list')
    .description('List child blocks of a block or page.')
    .argument('<block-id>', 'Notion block or page ID')
    .option('--numbered-lines', 'Include line numbers')
    .option('--raw', 'Output raw Notion block objects (JSON)')
    .option('-l, --limit <n>', 'Maximum blocks to return', '100')
    .option('--cursor <cursor>', 'Pagination cursor')
    .action(
      async (
        rawId: string,
        cmdOpts: { numberedLines?: boolean; raw?: boolean; limit?: string; cursor?: string },
      ) => {
        try {
          const opts = block.optsWithGlobals<GlobalOptions>();
          const blockId = parseNotionId(rawId);
          const client = getClient(opts.token);

          if (cmdOpts.raw === true || isJsonMode()) {
            // Raw block output
            const limit = parseInt(cmdOpts.limit ?? '100', 10);
            const response = await withRetry(
              () =>
                client.blocks.children.list({
                  block_id: blockId,
                  page_size: Math.min(limit, 100),
                  start_cursor: cmdOpts.cursor,
                }),
              'blocks.children.list',
            );

            printSuccess(
              { blocks: response.results },
              {
                hasMore: response.has_more,
                cursor: response.next_cursor ?? undefined,
                totalCount: response.results.length,
              },
            );
          } else {
            // Markdown output
            let markdown = await withRetry(
              () => notionPageToMarkdown(client, blockId),
              'pageToMarkdown',
            );

            if (cmdOpts.numberedLines === true) {
              markdown = addLineNumbers(markdown);
            }

            process.stdout.write(`${markdown}\n`);
          }
        } catch (err) {
          const cliErr = toCliError(err);
          printError(cliErr.code, cliErr.message);
          process.exitCode = cliErr.exitCode;
        }
      },
    );
}
