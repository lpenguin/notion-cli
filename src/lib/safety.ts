/**
 * Safety module — confirmation prompts, dry-run, and write guards.
 *
 * All destructive operations require confirmation unless --yes is passed.
 * This is the single point of control for write safety.
 */

import { createInterface } from 'node:readline';
import chalk from 'chalk';
import * as logger from '../utils/logger.js';

/**
 * Ask for user confirmation before a destructive operation.
 * Returns true if the user confirms, false otherwise.
 *
 * Skips prompt and returns true if `skipConfirm` is true (--yes / -y flag).
 * AI agents should always pass --yes to skip interactive prompts.
 */
export async function confirmAction(
  message: string,
  skipConfirm: boolean,
): Promise<boolean> {
  if (skipConfirm) {
    logger.debug(`Auto-confirmed: ${message}`);
    return true;
  }

  // Non-interactive (piped stdin) → default to NO for safety
  if (!process.stdin.isTTY) {
    logger.warn('Non-interactive terminal detected. Use --yes to confirm. Aborting.');
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stderr, // prompts go to stderr, not stdout
  });

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow('?')} ${message} ${chalk.gray('[y/N]')} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Guard for dry-run mode.
 * Returns true if we should skip the actual write (dry-run is active).
 */
export function isDryRun(dryRun?: boolean): boolean {
  if (dryRun === true) {
    logger.info(chalk.cyan('[DRY RUN] No changes will be made.'));
    return true;
  }
  return false;
}

/**
 * Display a diff preview before applying changes.
 */
export function showDiffPreview(before: string, after: string): void {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  process.stderr.write(`\n${chalk.bold('Changes preview:')}\n`);

  const maxLines = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLines; i++) {
    const bLine = beforeLines[i];
    const aLine = afterLines[i];

    if (bLine === aLine) {
      process.stderr.write(`  ${chalk.gray(bLine ?? '')}\n`);
    } else if (bLine !== undefined && aLine !== undefined) {
      process.stderr.write(`${chalk.red(`- ${bLine}`)}\n`);
      process.stderr.write(`${chalk.green(`+ ${aLine}`)}\n`);
    } else if (bLine !== undefined) {
      process.stderr.write(`${chalk.red(`- ${bLine}`)}\n`);
    } else if (aLine !== undefined) {
      process.stderr.write(`${chalk.green(`+ ${aLine}`)}\n`);
    }
  }
  process.stderr.write('\n');
}
