#!/usr/bin/env node
'use strict';

/**
 * @file CLI entry point for gm-lint.
 * @remarks CLI core.
 */

import path from 'path';
import { Engine } from '../src/engine.js';

// Stream helper for CLI output
const stdout = (msg = '') => process.stdout.write(msg + '\n');

// Constants replacing magic numbers
const ARG_OFFSET = 2;

const COLOR = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Parses command-line arguments, supporting both space-separated and equals syntax for options.
 * @param {string[]} argv - Command line argument strings.
 * @returns {{ patterns: string[], rulesDir: string|null, configFile: string|null, help?: boolean }} Parsed arguments.
 */
function parseArgs(argv) 
{
  const args = { patterns: [], rulesDir: null, configFile: null };
  for (let i = 0; i < argv.length; i++) 
  {
    const arg = argv[i];
    if (arg === '--rules-dir') 
    {
      args.rulesDir = argv[++i];
    }
    else if (arg.startsWith('--rules-dir=')) 
    {
      args.rulesDir = arg.split('=')[1];
    }
    else if (arg === '--config') 
    {
      args.configFile = argv[++i];
    }
    else if (arg.startsWith('--config=')) 
    {
      args.configFile = arg.split('=')[1];
    }
    else if (arg === '--help' || arg === '-h') 
    {
      args.help = true;
    }
    else 
    {
      args.patterns.push(arg);
    }
  }
  return args;
}

/**
 * Prints help information to standard output.
 * @returns {void}
 */
function printHelp() 
{
  stdout(`gml-lint - a Feather-inspired linter for GameMaker Language (GML)

Usage:
  gml-lint [patterns...] [--rules-dir <dir>] [--config <file>]

If no patterns are given, defaults to "src/rules/gm*.gml" so the linter
is callable out of the box against its own example rule fixtures.

Examples:
  gml-lint                                   # lint the bundled gm*.gml fixtures
  gml-lint "scripts/**/*.gml"                # lint an entire GameMaker project
  gml-lint --config .config/gm-lint.json     # lint using a custom config file
`);
}

/**
 * Formats lint results into printable strings.
 * @param {object} result - Lint result object for a file.
 * @returns {string[]} Array of formatted message lines.
 */
function formatResult(result) 
{
  const lines = [];
  if (result.messages.length === 0) 
  {
    return lines;
  }
  lines.push(COLOR.bold(path.relative(process.cwd(), result.filePath)));
  for (const msg of result.messages) 
  {
    const tag = msg.severity === 'error' ? COLOR.red('error') : COLOR.yellow('warning');
    const location = COLOR.gray(`${msg.line}:${msg.column}`);
    lines.push(`  ${location}  ${tag}  ${msg.message}  ${COLOR.gray(msg.ruleId)}`);
  }
  return lines;
}

/**
 * Main entry point for the CLI runner.
 * @returns {Promise<void>}
 */
async function main() 
{
  const args = parseArgs(process.argv.slice(ARG_OFFSET));
  if (args.help) 
  {
    printHelp();
    return;
  }

  const patterns = args.patterns.length > 0 ? args.patterns : ['src/rules/gm*.gml'];
  const engine = new Engine({
    rulesDir: args.rulesDir ? path.resolve(args.rulesDir) : undefined,
    configFile: args.configFile ? path.resolve(args.configFile) : undefined,
  });

  await engine.loadRulesAsync();

  stdout(COLOR.gray(`Loaded ${engine.rules.length} rule(s): ${engine.rules.map((r) => r.id).join(', ')}`));
  stdout(COLOR.gray(`Linting: ${patterns.join(', ')}`));

  const results = engine.lintFiles(patterns);

  if (results.length === 0) 
  {
    stdout(COLOR.yellow(`No files matched ${patterns.join(', ')}`));
    process.exitCode = 0;
    return;
  }

  let printedAny = false;
  for (const result of results) 
  {
    const lines = formatResult(result);
    if (lines.length) 
    {
      printedAny = true;
      stdout('');
      stdout(lines.join('\n'));
    }
  }

  const { errors, warnings } = Engine.countBySeverity(results);
  stdout('');
  if (!printedAny) 
  {
    stdout(`${results.length} file(s) checked, no issues found.`);
  }
  else 
  {
    stdout(
      `${results.length} file(s) checked - ` +
        `${COLOR.red(`${errors} error(s)`)}, ${COLOR.yellow(`${warnings} warning(s)`)}.`,
    );
  }

  process.exitCode = errors > 0 ? 1 : 0;
}

main();