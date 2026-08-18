#!/usr/bin/env node

/**
 * @file CLI entry point for gm-lint project execution.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL, URL } from 'node:url';
import { lintProject } from '../src/engine.js';

const CLI_ARG_INDEX = 2;

/**
 * Resolves the target project directory from command-line arguments.
 * @param {string} [argPath] - Optional command line argument path.
 * @returns {string} The resolved project directory path.
 */
function resolveProjectPath(argPath)
{
  const resolvedPath = path.resolve(process.cwd(), argPath || process.cwd());
  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory())
  {
    return resolvedPath;
  }
  if (resolvedPath.endsWith('.yyp'))
  {
    return path.dirname(resolvedPath);
  }
  throw new Error(`Invalid project path: ${resolvedPath}`);
}

/**
 * Loads configuration settings from gm-lint.json.
 * @param {string} projectDir - The project directory path.
 * @returns {object} The loaded configuration object.
 */
function loadConfiguration(projectDir)
{
  const configPath = path.join(projectDir, 'gm-lint.json');
  const localConfigPath = path.resolve(process.cwd(), 'gm-lint.json');
  const activeConfigPath = fs.existsSync(localConfigPath) ? localConfigPath : configPath;
    
  if (fs.existsSync(activeConfigPath))
  {
    return JSON.parse(fs.readFileSync(activeConfigPath, 'utf8'));
  }
  return { rules: {} };
}

/**
 * Dynamically loads all lint rules from the rules directory.
 * @param {string} rulesDir - Directory containing rule files.
 * @param {object} config - Configuration object specifying enabled/disabled rules.
 * @returns {Promise<Array<object>>} Array of active rule objects.
 */
async function loadRules(rulesDir, config)
{
  const rules = [];
  if (fs.existsSync(rulesDir))
  {
    const ruleFiles = fs.readdirSync(rulesDir).filter(file => file.endsWith('.js'));
    for (const file of ruleFiles)
    {
      const rulePath = pathToFileURL(path.join(rulesDir, file)).href;
      const imported = await import(rulePath);
      const rule = imported.default;
            
      if (config.rules[rule.id] !== 'off')
      {
        rules.push(rule);
      }
    }
  }
  return rules;
}

/**
 * Recursively collects all GML files within the project directory.
 * @param {string} currentPath - Current directory being scanned.
 * @param {Array<object>} codeFileCollection - Accumulator array for code files.
 * @returns {void}
 */
function collectCodeFiles(currentPath, codeFileCollection)
{
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  for (const entry of entries)
  {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory())
    {
      if (!entry.name.startsWith('.'))
      {
        collectCodeFiles(fullPath, codeFileCollection);
      }
    }
    else if (entry.isFile() && entry.name.endsWith('.gml'))
    {
      codeFileCollection.push({
        name: entry.name,
        absolute: fullPath,
        content: fs.readFileSync(fullPath, 'utf8')
      });
    }
  }
}

/**
 * Reports linting issues to stdout.
 * @param {Array<object>} issues - Array of detected lint issues.
 * @param {string} projectDir - Project root directory path.
 * @returns {void}
 */
function reportIssues(issues, projectDir)
{
  let totalErrors = 0;
  const byFile = {};
  issues.forEach(issue =>
  {
    byFile[issue.file] = byFile[issue.file] || [];
    byFile[issue.file].push(issue);
  });

  for (const [file, fileIssues] of Object.entries(byFile))
  {
    process.stdout.write(`\n📄 ${path.relative(projectDir, file)}\n`);
    fileIssues.forEach(issue =>
    {
      process.stdout.write(`  [${issue.ruleId}] Line ${issue.line}: ${issue.message}\n`);
      totalErrors++;
    });
  }

  process.stdout.write(`\n❌ Found ${totalErrors} issue(s).\n`);
  process.exit(1);
}

/**
 * Main asynchronous CLI execution function.
 * @returns {Promise<void>} Resolves when execution completes.
 */
async function main()
{
   
  const argPath = process.argv[CLI_ARG_INDEX];
  let projectDir;

  try
  {
    projectDir = resolveProjectPath(argPath);
  }
  catch
  {
    process.stderr.write(`❌ Error reading path argument: ${argPath || process.cwd()}\n`);
    process.exit(1);
  }

  process.stdout.write(`📂 Target Project Directory: ${projectDir}\n`);

  const config = loadConfiguration(projectDir);
  const rulesDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src/rules');
  const rules = await loadRules(rulesDir, config);

  try
  {
    process.stdout.write('⚙️ Scanning project GML files...\n');
    const codeFiles = [];
    collectCodeFiles(projectDir, codeFiles);

    const issues = lintProject({ codeFiles }, rules);

    if (issues.length > 0)
    {
      reportIssues(issues, projectDir);
    }
    else
    {
      process.stdout.write('\n✅ Linting passed! No issues found.\n');
    }
  }
  catch (err)
  {
    process.stderr.write(`❌ Error processing GameMaker project: ${err}\n`);
    process.exit(1);
  }
}

main();