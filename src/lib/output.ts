/**
 * Output formatter — JSON mode for AI agents, human-readable for terminals.
 * Data always goes to stdout; status/progress goes to stderr (via logger).
 */

import chalk from 'chalk';
import { type CliResponse, type CliSuccessResponse, type CliErrorResponse, type ResponseMeta } from './types.js';

let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

/** Output a successful result. */
export function printSuccess<T>(data: T, meta?: ResponseMeta): void {
  if (jsonMode) {
    const response: CliSuccessResponse<T> = { ok: true, data, ...(meta !== undefined ? { meta } : {}) };
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } else {
    if (typeof data === 'string') {
      process.stdout.write(`${data}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    }
  }
}

/** Output an error result. */
export function printError(code: string, message: string, details?: unknown): void {
  if (jsonMode) {
    const response: CliErrorResponse = {
      ok: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    };
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  } else {
    process.stderr.write(`${chalk.red('Error')} [${code}]: ${message}\n`);
    if (details !== undefined) {
      process.stderr.write(`${chalk.gray(JSON.stringify(details, null, 2))}\n`);
    }
  }
}

/** Format a table of key-value pairs for human display. */
export function formatTable(rows: readonly (readonly [string, string])[]): string {
  const maxKeyLen = Math.max(...rows.map(([key]) => key.length));
  return rows
    .map(([key, value]) => `  ${chalk.bold(key.padEnd(maxKeyLen))}  ${value}`)
    .join('\n');
}

/** Format a list of items with index numbers. */
export function formatList(items: readonly string[]): string {
  return items.map((item, i) => `  ${chalk.gray(`${String(i + 1)}.`)} ${item}`).join('\n');
}

/**
 * Wrap a command handler: catches errors, formats output, sets exit code.
 */
export function wrapOutput(response: CliResponse): void {
  if (response.ok) {
    printSuccess(response.data, response.meta);
  } else {
    printError(response.error.code, response.error.message, response.error.details);
  }
}
