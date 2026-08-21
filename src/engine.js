'use strict';

/**
 * @file Engine implementation for running Feather-inspired lint rules against GML source files.
 * @remarks Linter engine core.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { parse } from './parser.js';
import { walk } from './walk.js';
import { globSync } from './glob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEVERITY = { off: 0, warning: 1, error: 2 };

/**
 * Helper to safely load and parse configuration files from disk with fallback options.
 * @param {string} [configPath] - Optional explicit path to config file.
 * @returns {object} The parsed configuration object.
 */
function loadConfigFile(configPath) 
{
  const possiblePaths = [
    configPath,
    path.resolve(process.cwd(), '.config/gm-lint.json'),
    path.resolve(process.cwd(), 'gm-lint.json'),
  ].filter(Boolean);

  for (const resolvedPath of possiblePaths)
  {
    try 
    {
      if (fs.existsSync(resolvedPath)) 
      {
        const content = fs.readFileSync(resolvedPath, 'utf8');
        return JSON.parse(content);
      }
    }
    catch (err) 
    {
      process.stderr.write(`Error loading config file at ${resolvedPath}: ${err.message}\n`);
    }
  }
  return {};
}

/**
 * Loads and runs Feather-inspired lint rules against GML source files.
 */
class Engine
{
  /**
   * Creates an instance of Engine.
   * @public
   * @param {object} [options] - Engine options.
   * @param {string} [options.rulesDir] - Directory containing rules.
   * @param {string} [options.configFile] - Path to custom configuration file.
   * @param {object} [options.config] - Configuration object for rules.
   */
  constructor({ rulesDir, configFile, config } = {})
  {
    const fileConfig = loadConfigFile(configFile);
    this.rulesDir = rulesDir || fileConfig.rulesDir || path.join(__dirname, 'rules');
    
    // Support flat config or nested { config: { ... } } or { rules: { ... } } structures
    const rawConfig = config || fileConfig.config || fileConfig;
    this.config = rawConfig;
    this.rules = [];
  }

  /**
   * Asynchronously loads lint rules from the rules directory.
   * @public
   * @returns {Promise<object[]>} Sorted array of loaded rule objects.
   */
  async loadRulesAsync()
  {
    const rules = [];
    let entries;
    try
    {
      entries = fs.readdirSync(this.rulesDir, { withFileTypes: true });
    }
    catch
    {
      return rules;
    }
    for (const entry of entries)
    {
      if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.startsWith('_'))
      {
        continue;
      }
      const modulePath = path.join(this.rulesDir, entry.name);
      try
      {
        const imported = await import(pathToFileURL(modulePath).href);
        const rule = imported.default || imported;
        if (!rule || !rule.id || typeof rule.create !== 'function')
        {
          process.stderr.write(`Skipping ${entry.name}: not a valid rule module (needs id + create()).\n`);
          continue;
        }
        rules.push(rule);
      }
      catch (err)
      {
        process.stderr.write(`Failed to load rule ${entry.name}: ${err.message}\n`);
      }
    }
    this.rules = rules.sort((a, b) => a.id.localeCompare(b.id));
    return this.rules;
  }

  /**
   * Synchronous fallback load rules for compatibility.
   * @public
   * @returns {object[]} Sorted array of loaded rule objects.
   */
  loadRules()
  {
    return this.rules;
  }

  /**
   * Gets the configured severity for a given rule, supporting root rules, nested rules blocks, or overrides.
   * @public
   * @param {object} rule - The rule object.
   * @returns {string|number} The severity level.
   */
  severityFor(rule)
  {
    const rulesBlock = this.config.rules || this.config;
    const override = rulesBlock[rule.id];
    
    if (override)
    {
      return Array.isArray(override) ? override[0] : override;
    }
    return (rule.meta && rule.meta.severity) || 'warning';
  }

  /**
   * Lint a single file's already-read source text.
   * @public
   * @param {string} source - The source code text.
   * @param {string} filename - The filename of the source.
   * @returns {{ filePath: string, messages: object[], ast: object }} The lint results.
   */
  lintSource(source, filename)
  {
    const messages = [];
    const ast = parse(source, { filename });

    for (const err of ast.errors)
    {
      messages.push({
        ruleId: 'syntax-error',
        severity: 'error',
        message: err.message,
        line: err.line,
        column: err.column,
      });
    }

    for (const rule of this.rules)
    {
      const severity = this.severityFor(rule);
      if (severity === 'off')
      {
        continue;
      }

      const rulesBlock = this.config.rules || this.config;
      const ruleEntry = rulesBlock[rule.id];
      const ruleOptions = Array.isArray(ruleEntry) ? ruleEntry[1] : (this.config[`${rule.id}:options`] || {});

      const context = {
        filename,
        source,
        ast,
        options: ruleOptions,
        /**
         * Reports a lint issue.
         * @public
         * @param {object} details - Report details.
         * @param {object} [details.node] - The AST node.
         * @param {string} details.message - The error message.
         * @param {number} [details.line] - The line number.
         * @param {number} [details.column] - The column number.
         * @returns {void}
         */
        report({ node, message, line, column })
        {
          const loc = node && node.loc ? node.loc : { line: line || 1, column: column || 1 };
          messages.push({
            ruleId: rule.id,
            severity,
            message,
            line: loc.line,
            column: loc.column,
          });
        },
      };

      let visitor;
      try
      {
        visitor = rule.create(context);
      }
      catch (err)
      {
        messages.push({
          ruleId: rule.id,
          severity: 'error',
          message: `Rule crashed: ${err.message}`,
          line: 1,
          column: 1,
        });
        continue;
      }
      if (visitor && typeof visitor === 'object')
      {
        walk(ast, visitor);
      }
    }

    messages.sort((a, b) => a.line - b.line || a.column - b.column);
    return { filePath: filename, messages, ast };
  }

  /**
   * Lints a single file by path.
   * @public
   * @param {string} filePath - Path to the file.
   * @returns {{ filePath: string, messages: object[], ast: object }} The lint results.
   */
  lintFile(filePath)
  {
    const source = fs.readFileSync(filePath, 'utf8');
    return this.lintSource(source, filePath);
  }

  /**
   * Lint every file matching one or more glob patterns.
   * @public
   * @param {string|string[]} patterns - Glob pattern or patterns.
   * @param {object} [options] - Lint options.
   * @param {string} [options.cwd] - Current working directory.
   * @returns {object[]} Array of lint results.
   */
  lintFiles(patterns, { cwd = process.cwd() } = {})
  {
    const list = Array.isArray(patterns) ? patterns : [patterns];
    const files = new Set();
    for (const pattern of list)
    {
      for (const file of globSync(pattern, cwd))
      {
        files.add(file);
      }
    }
    return [...files].sort().map((file) => this.lintFile(file));
  }

  /**
   * Counts errors and warnings across multiple lint results.
   * @public
   * @param {object[]} results - Array of lint results.
   * @returns {{ errors: number, warnings: number }} Count totals.
   */
  static countBySeverity(results)
  {
    let errors = 0;
    let warnings = 0;
    for (const result of results)
    {
      for (const msg of result.messages)
      {
        if (msg.severity === 'error')
        {
          errors++;
        }
        else if (msg.severity === 'warning')
        {
          warnings++;
        }
      }
    }
    return { errors, warnings };
  }
}

export { Engine, SEVERITY };