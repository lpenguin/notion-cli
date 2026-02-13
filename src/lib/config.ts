/**
 * Configuration loading with precedence:
 * 1. --token CLI flag (highest)
 * 2. NOTION_TOKEN environment variable
 * 3. ~/.notion-cli.json config file
 * 4. ./.notion-cli.json in current directory
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { config as loadDotenv } from 'dotenv';
import { type CliConfig } from './types.js';
import { AuthError } from './errors.js';
import * as logger from '../utils/logger.js';

/** Load .env file if present. */
loadDotenv();

/**
 * Resolve the Notion API token from available sources.
 * Throws AuthError if no token is found.
 */
export function resolveToken(cliToken?: string): string {
  // 1. CLI flag
  if (cliToken !== undefined && cliToken !== '') {
    logger.debug(`Using token from --token flag: ${logger.maskToken(cliToken)}`);
    return cliToken;
  }

  // 2. Environment variable
  const envToken = process.env['NOTION_TOKEN'];
  if (envToken !== undefined && envToken !== '') {
    logger.debug(`Using token from NOTION_TOKEN env var: ${logger.maskToken(envToken)}`);
    return envToken;
  }

  // 3. Config file (home dir, then current dir)
  const config = loadConfig();
  if (config?.token !== undefined && config.token !== '') {
    logger.debug(`Using token from config file: ${logger.maskToken(config.token)}`);
    return config.token;
  }

  throw new AuthError();
}

/**
 * Load config from ~/.notion-cli.json or ./.notion-cli.json.
 * Returns undefined if no config file exists.
 */
export function loadConfig(): CliConfig | undefined {
  const paths = [
    join(homedir(), '.notion-cli.json'),
    join(process.cwd(), '.notion-cli.json'),
  ];

  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as CliConfig;
        logger.debug(`Loaded config from ${configPath}`);
        return parsed;
      } catch (err) {
        logger.warn(`Failed to parse config at ${configPath}: ${String(err)}`);
      }
    }
  }

  return undefined;
}
