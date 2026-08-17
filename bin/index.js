#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runEngine } from '../src/engine.js';

const HELP_MESSAGE = `Usage: gm-lint [options]

Options:
  --help     Display help text
  --version  Display version
  --config   Allow a config path to be set
`;

const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;
const CONFIG_FLAG_OFFSET = 1;
const DEFAULT_FALLBACK_VERSION = '0.0.0';

/**
 * Reads the current package version from package.json.
 * @returns {string} The version string defined in package.json.
 */
function getPackageVersion() 
{
  try 
  {
    const packagePath = path.join(import.meta.dirname, '..', 'package.json');
    const packageRaw = fs.readFileSync(packagePath, 'utf8');
    const packageData = JSON.parse(packageRaw);
    return packageData.version || DEFAULT_FALLBACK_VERSION;
  }
  catch 
  {
    return DEFAULT_FALLBACK_VERSION;
  }
}

/**
 * Parses command-line flags and executes the CLI application.
 * @param {string[]} args - Command-line arguments.
 * @returns {Promise<number>} Resolves with an exit code.
 */
export async function runCli(args) 
{
  if (args.includes('--help')) 
  {
    process.stdout.write(HELP_MESSAGE);
    return EXIT_SUCCESS;
  }

  if (args.includes('--version')) 
  {
    const version = getPackageVersion();
    process.stdout.write(`v${version}\n`);
    return EXIT_SUCCESS;
  }

  let configPath = null;
  const configIndex = args.indexOf('--config');

  if (configIndex !== -1 && args[configIndex + CONFIG_FLAG_OFFSET]) 
  {
    configPath = args[configIndex + CONFIG_FLAG_OFFSET];
  }

  const success = await runEngine(configPath);
  return success ? EXIT_SUCCESS : EXIT_FAILURE;
}

runCli(process.argv.slice(2)).then((code) => 
{
  process.exitCode = code;
});