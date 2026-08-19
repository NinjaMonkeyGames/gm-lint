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
 * Displays CLI help instructions.
 */
function printHelp()
{
  process.stdout.write(`
gm-lint - A linter for GameMaker projects

Usage:
  gm-lint [project-path] [options]

Options:
  --config <path>   Path to custom gm-lint.json configuration file
  --help, -h        Show help documentation
  --version, -v     Show version number
\n`);
}

/**
 * Displays CLI version.
 */
function printVersion()
{
  process.stdout.write('gm-lint v1.0.0\n');
}

/**
 * Parses command line arguments.
 * @param {string[]} args - Process arguments.
 * @returns {object} Parsed options object.
 */
function parseArgs(args)
{
  const options = {
    help: false,
    version: false,
    configPath: null,
    projectDir: null
  };

  for (let i = 0; i < args.length; i++)
  {
    const arg = args[i];
    if (arg === '--help' || arg === '-h')
    {
      options.help = true;
    }
    else if (arg === '--version' || arg === '-v')
    {
      options.version = true;
    }
    else if (arg === '--config')
    {
      options.configPath = args[++i];
    }
    else if (!arg.startsWith('-'))
    {
      options.projectDir = arg;
    }
  }
  return options;
}

/**
 * Resolves the target project directory from command-line arguments.
 * @param {string} [argPath] - Optional command line argument path.
 * @returns {string} The resolved project directory path.
 */
function resolveProjectPath(argPath)
{
  const resolvedPath = path.resolve(process.cwd(), argPath || process.cwd());
  if (!fs.existsSync(resolvedPath))
  {
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }
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
 * Searches upwards through parent directories for gm-lint.json.
 * @param {string} startDir - Directory to start searching from.
 * @returns {string|null} Path to gm-lint.json or null if not found.
 */
function findConfigurationFile(startDir)
{
  let currentDir = path.resolve(startDir);
  while (true)
  {
    const candidate = path.join(currentDir, 'gm-lint.json');
    if (fs.existsSync(candidate))
    {
      return candidate;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir)
    {
      break;
    }
    currentDir = parentDir;
  }
  return null;
}

/**
 * Loads configuration settings from gm-lint.json or custom path.
 * @param {string} projectDir - The project directory path.
 * @param {string} [customConfigPath] - Optional explicit config path via --config.
 * @returns {object} The loaded configuration object.
 */
function loadConfiguration(projectDir, customConfigPath)
{
  const activeConfigPath = customConfigPath 
    ? path.resolve(process.cwd(), customConfigPath) 
    : findConfigurationFile(projectDir);
    
  if (activeConfigPath && fs.existsSync(activeConfigPath))
  {
    try
    {
      return JSON.parse(fs.readFileSync(activeConfigPath, 'utf8'));
    }
    catch (err)
    {
      process.stderr.write(`❌ Error parsing configuration file at ${activeConfigPath}: ${err.message}\n`);
      process.exit(1);
    }
  }
  return { rules: {} };
}

/**
 * Dynamically loads all lint rules from the rules directory and applies severity configurations.
 * @param {string} rulesDir - Directory containing rule files.
 * @param {object} config - Configuration object specifying rule severities.
 * @returns {Promise<Array<object>>} Array of active rule objects with severity metadata.
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
            
      const ruleConfig = config.rules && config.rules[rule.id];
      let enabled = true;
      let severity = 'error';

      if (ruleConfig)
      {
        if (typeof ruleConfig === 'string')
        {
          if (ruleConfig === 'off')
          {
            enabled = false;
          }
          else
          {
            severity = ruleConfig; // 'error', 'warning', 'info'
          }
        }
        else if (typeof ruleConfig === 'object' && ruleConfig !== null)
        {
          if (ruleConfig.severity === 'off')
          {
            enabled = false;
          }
          else if (ruleConfig.severity)
          {
            severity = ruleConfig.severity;
          }
        }
      }

      if (enabled)
      {
        rules.push({ ...rule, severity });
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
 * Reports linting issues to stdout with severity indicators.
 * @param {Array<object>} issues - Array of detected lint issues.
 * @param {string} projectDir - Project root directory path.
 * @returns {void}
 */
function reportIssues(issues, projectDir)
{
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  const byFile = {};

  issues.forEach(issue =>
  {
    byFile[issue.file] = byFile[issue.file] || [];
    byFile[issue.file].push(issue);
    if (issue.severity === 'warning') 
    {
      warningCount++;
    }
    else if (issue.severity === 'info') 
    {
      infoCount++;
    }
    else 
    {
      errorCount++;
    }
  });

  for (const [file, fileIssues] of Object.entries(byFile))
  {
    process.stdout.write(`\n📄 ${path.relative(projectDir, file)}\n`);
    fileIssues.forEach(issue =>
    {
      const icon = issue.severity === 'warning' ? '⚠️' : issue.severity === 'info' ? 'ℹ️' : '❌';
      process.stdout.write(`  ${icon} [${issue.ruleId}] Line ${issue.line}: ${issue.message} (${issue.severity})\n`);
    });
  }

  process.stdout.write(`\nSummary: ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info(s).\n`);
  
  if (errorCount > 0)
  {
    process.exit(1);
  }
  else
  {
    process.exit(0);
  }
}

/**
 * Main asynchronous CLI execution function.
 * @returns {Promise<void>} Resolves when execution completes.
 */
async function main()
{
  const options = parseArgs(process.argv.slice(CLI_ARG_INDEX));

  if (options.help)
  {
    printHelp();
    process.exit(0);
  }

  if (options.version)
  {
    printVersion();
    process.exit(0);
  }

  let projectDir;
  try
  {
    projectDir = resolveProjectPath(options.projectDir);
  }
  catch (err)
  {
    process.stderr.write(`❌ Error resolving project path: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`📂 Target Project Directory: ${projectDir}\n`);

  const config = loadConfiguration(projectDir, options.configPath);
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