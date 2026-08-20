'use strict';

/**
 * @file Engine implementation for running Feather-inspired lint rules against GML source files.
 * @remarks Linter engine core.
 */

const fs = require('fs');
const path = require('path');

const { parse } = require('./parser');
const { walk } = require('./walk');
const { globSync } = require('./glob');

const SEVERITY = { off: 0, warning: 1, error: 2 };

/**
 * Loads and runs Feather-inspired lint rules against GML source files.
 *
 * A rule module looks like:
 *
 *   module.exports = {
 *     id: 'GM1013',
 *     meta: { description: '...', severity: 'error' },
 *     create(context) {
 *       return {
 *         Identifier(node) { context.report({ node, message: '...' }); },
 *       };
 *     },
 *   };
 */
class Engine
{
  /**
   * Creates an instance of Engine.
   * @public
   * @param {object} [options={}] - Engine options.
   * @param {string} [options.rulesDir=path.join(__dirname, 'rules')] - Directory containing rules.
   * @param {object} [options.config={}] - Configuration object for rules.
   */
  constructor({ rulesDir = path.join(__dirname, 'rules'), config = {} } = {})
  {
    this.rulesDir = rulesDir;
    this.config = config; // e.g. { 'GM1013': 'off' }
    this.rules = this.loadRules();
  }

  /**
   * Loads lint rules from the rules directory.
   * @public
   * @returns {object[]} Sorted array of loaded rule objects.
   */
  loadRules()
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
      // eslint-disable-next-line import/no-dynamic-require
      const rule = require(modulePath);
      if (!rule || !rule.id || typeof rule.create !== 'function')
      {
        // eslint-disable-next-line no-console
        console.warn(`Skipping ${entry.name}: not a valid rule module (needs id + create()).`);
        continue;
      }
      rules.push(rule);
    }
    return rules.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Gets the configured severity for a given rule.
   * @public
   * @param {object} rule - The rule object.
   * @returns {string|number} The severity level.
   */
  severityFor(rule)
  {
    const override = this.config[rule.id];
    if (override)
    {
      return override;
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

      const context = {
        filename,
        source,
        ast,
        options: (this.config[`${rule.id}:options`]) || {},
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
   * @param {object} [options={}] - Lint options.
   * @param {string} [options.cwd=process.cwd()] - Current working directory.
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

module.exports = { Engine, SEVERITY };