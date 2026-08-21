#!/usr/bin/env node
'use strict';

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

function parseArgs(argv) 
{
  const args = { patterns: [], rulesDir: null };
  for (let i = 0; i < argv.length; i++) 
  {
    const arg = argv[i];
    if (arg === '--rules-dir') 
    {
      args.rulesDir = argv[++i];
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

function printHelp() 
{
  stdout(`gml-lint - a Feather-inspired linter for GameMaker Language (GML)

Usage:
  gml-lint [patterns...] [--rules-dir <dir>]

If no patterns are given, defaults to "src/rules/gm*.gml" so the linter
is callable out of the box against its own example rule fixtures.

Examples:
  gml-lint                          # lint the bundled gm*.gml fixtures
  gml-lint "scripts/**/*.gml"       # lint an entire GameMaker project
  gml-lint objects/obj_player/*.gml
`);
}

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

async function main() 
{
  const args = parseArgs(process.argv.slice(ARG_OFFSET));
  if (args.help) 
  {
    printHelp();
    return;
  }

  const patterns = args.patterns.length > 0 ? args.patterns : ['src/rules/gm*.gml'];
  const engine = new Engine(args.rulesDir ? { rulesDir: path.resolve(args.rulesDir) } : {});

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