import { describe, it, expect } from 'vitest';
import { CliError, AuthError, ValidationError, NotFoundError, RateLimitError, toCliError } from '../src/lib/errors.js';

describe('Error Classes', () => {
  it('CliError strips tokens from messages', () => {
    const err = new CliError(
      'Failed with token ntn_abc123xyz789_secret',
      'TEST',
      1,
    );
    expect(err.message).not.toContain('ntn_abc123xyz789_secret');
    expect(err.message).toContain('[REDACTED]');
  });

  it('CliError strips secret_ tokens', () => {
    const err = new CliError(
      'Token: secret_abc123xyz789',
      'TEST',
      1,
    );
    expect(err.message).not.toContain('secret_abc123xyz789');
    expect(err.message).toContain('[REDACTED]');
  });

  it('AuthError has correct code and exit code', () => {
    const err = new AuthError();
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.exitCode).toBe(3);
  });

  it('ValidationError has correct code and exit code', () => {
    const err = new ValidationError('bad input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.exitCode).toBe(2);
  });

  it('NotFoundError has correct code', () => {
    const err = new NotFoundError('Page', 'abc-123');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.exitCode).toBe(4);
    expect(err.message).toContain('abc-123');
  });

  it('RateLimitError has correct code', () => {
    const err = new RateLimitError(5000);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.exitCode).toBe(5);
    expect(err.retryAfterMs).toBe(5000);
  });

  describe('toCliError', () => {
    it('should pass through CliError instances', () => {
      const original = new ValidationError('test');
      const result = toCliError(original);
      expect(result).toBe(original);
    });

    it('should convert Notion 401 to AuthError', () => {
      const err = Object.assign(new Error('Unauthorized'), { status: 401 });
      const result = toCliError(err);
      expect(result.code).toBe('AUTH_ERROR');
    });

    it('should convert Notion 404 to NotFoundError', () => {
      const err = Object.assign(new Error('Not found'), { status: 404 });
      const result = toCliError(err);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should convert Notion 429 to RateLimitError', () => {
      const err = Object.assign(new Error('Rate limited'), { status: 429 });
      const result = toCliError(err);
      expect(result.code).toBe('RATE_LIMITED');
    });

    it('should convert unknown errors to generic CliError', () => {
      const result = toCliError('something went wrong');
      expect(result.code).toBe('GENERAL_ERROR');
    });
  });
});
