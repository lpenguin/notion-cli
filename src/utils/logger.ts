/**
 * Structured logger — all status/progress goes to stderr.
 * Data output goes to stdout (handled by output.ts).
 * This ensures clean piping for AI agents.
 */

import chalk from 'chalk';

let verboseEnabled = false;

export function setVerbose(enabled: boolean): void {
  verboseEnabled = enabled;
}

export function isVerbose(): boolean {
  return verboseEnabled;
}

/** Log informational message to stderr. */
export function info(message: string): void {
  process.stderr.write(`${chalk.blue('ℹ')} ${message}\n`);
}

/** Log success message to stderr. */
export function success(message: string): void {
  process.stderr.write(`${chalk.green('✔')} ${message}\n`);
}

/** Log warning message to stderr. */
export function warn(message: string): void {
  process.stderr.write(`${chalk.yellow('⚠')} ${message}\n`);
}

/** Log error message to stderr. */
export function error(message: string): void {
  process.stderr.write(`${chalk.red('✖')} ${message}\n`);
}

/** Log debug message to stderr (only when --verbose). */
export function debug(message: string): void {
  if (verboseEnabled) {
    process.stderr.write(`${chalk.gray('⋯')} ${message}\n`);
  }
}

/** Mask a token for safe logging. Shows first 4 and last 4 chars. */
export function maskToken(token: string): string {
  if (token.length <= 12) {
    return '****';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
