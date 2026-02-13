/**
 * Custom error classes with structured error codes.
 * All errors sanitize sensitive information (tokens, secrets).
 */

import { ExitCode, type ExitCodeValue } from './types.js';

/** Base CLI error with structured code and exit code. */
export class CliError extends Error {
  readonly code: string;
  readonly exitCode: ExitCodeValue;
  readonly details?: unknown;

  constructor(message: string, code: string, exitCode: ExitCodeValue, details?: unknown) {
    super(sanitizeMessage(message));
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

export class AuthError extends CliError {
  constructor(message = 'Authentication failed. Set NOTION_TOKEN or use --token.') {
    super(message, 'AUTH_ERROR', ExitCode.AUTH_ERROR);
    this.name = 'AuthError';
  }
}

export class ValidationError extends CliError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', ExitCode.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends CliError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', ExitCode.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends CliError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(
      `Rate limited by Notion API. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
      'RATE_LIMITED',
      ExitCode.RATE_LIMITED,
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class PatchConflictError extends CliError {
  constructor(message = 'Patch cannot be applied: page content has changed since last read.') {
    super(message, 'PATCH_CONFLICT', ExitCode.GENERAL_ERROR);
    this.name = 'PatchConflictError';
  }
}

/**
 * Strip any token-like strings from error messages.
 * Matches patterns: ntn_*, secret_*, Bearer *, and long hex strings.
 */
function sanitizeMessage(message: string): string {
  return message
    .replace(/\b(ntn_[A-Za-z0-9_-]+)\b/g, '[REDACTED]')
    .replace(/\b(secret_[A-Za-z0-9_-]+)\b/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9_-]+/g, 'Bearer [REDACTED]')
    .replace(/\b[a-f0-9]{40,}\b/gi, '[REDACTED]');
}

/**
 * Convert any thrown value into a structured CliError.
 * Handles Notion API errors, Zod validation errors, and unknown throws.
 */
export function toCliError(err: unknown): CliError {
  if (err instanceof CliError) {
    return err;
  }

  if (err instanceof Error) {
    // Notion API error shape
    const notionErr = err as Error & { status?: number; code?: string; body?: unknown };

    if (notionErr.status === 401 || notionErr.code === 'unauthorized') {
      return new AuthError();
    }
    if (notionErr.status === 404 || notionErr.code === 'object_not_found') {
      return new NotFoundError('Resource', 'unknown');
    }
    if (notionErr.status === 429) {
      return new RateLimitError(1000);
    }

    return new CliError(
      err.message,
      'GENERAL_ERROR',
      ExitCode.GENERAL_ERROR,
    );
  }

  return new CliError(
    String(err),
    'GENERAL_ERROR',
    ExitCode.GENERAL_ERROR,
  );
}
