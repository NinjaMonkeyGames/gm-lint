import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_CONFIG_FILENAME = 'gm-lint.json';
const GML_EXTENSION = '.gml';
const RULE_DIR_NAME = 'rules';
const IGNORE_TAG = '@ignore';
const DEFAULT_FALLBACK_SEVERITY = 'warning';

/**
 * Searches recursively for all .gml files within a directory.
 * @param {string} dirPath - Directory path to search.
 * @returns {string[]} Array of absolute file paths.
 */
export function findGmlFiles(dirPath)
{
  let results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries)
  {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory())
    {
      results = results.concat(findGmlFiles(fullPath));
    }
    else if (entry.isFile() && path.extname(entry.name) === GML_EXTENSION)
    {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Finds the nearest config file or recursively locates gm-lint.json in the project root.
 * @param {string} searchDir - The root directory to start searching from.
 * @returns {string|null} Path to the configuration file, or null if not found.
 */
export function findConfigFile(searchDir)
{
  const entries = fs.readdirSync(searchDir, { withFileTypes: true });

  for (const entry of entries)
  {
    const fullPath = path.join(searchDir, entry.name);
    if (entry.isFile() && entry.name === DEFAULT_CONFIG_FILENAME)
    {
      return fullPath;
    }

    if (entry.isDirectory() && entry.name !== 'node_modules')
    {
      const found = findConfigFile(fullPath);
      if (found)
      {
        return found;
      }
    }
  }

  return null;
}

/**
 * Loads and dynamically imports rule modules from src/rules.
 * @param {string} rulesDirectory - Path to the rules directory.
 * @returns {Promise<Map<string, {run: (content: string, lines: string[]) => Array<{line: number, column: number, message: string}>, meta: object}>>} Map of rule IDs to handlers and metadata.
 */
export async function loadRules(rulesDirectory)
{
  const ruleMap = new Map();

  if (!fs.existsSync(rulesDirectory))
  {
    return ruleMap;
  }

  const files = fs.readdirSync(rulesDirectory).filter((file) =>
  {
    return file.endsWith('.js');
  });

  for (const file of files)
  {
    const ruleId = path.basename(file, '.js');
    const filePath = path.join(rulesDirectory, file);
    const fileUrl = pathToFileURL(filePath).href;
    const ruleModule = await import(fileUrl);

    if (typeof ruleModule.default === 'function')
    {
      ruleMap.set(ruleId, {
        run: ruleModule.default,
        meta: ruleModule.meta || {},
      });
    }
  }

  return ruleMap;
}

/**
 * Resolves rule configuration from the config object ignoring case differences.
 * @param {Record<string, { enabled?: boolean, severity?: string }>} rulesConfig - Config rules object.
 * @param {string} ruleId - The ID of the rule being evaluated.
 * @returns {{ enabled?: boolean, severity?: string }} Matching rule configuration.
 */
function getRuleConfig(rulesConfig, ruleId)
{
  if (!rulesConfig)
  {
    return {};
  }

  if (rulesConfig[ruleId])
  {
    return rulesConfig[ruleId];
  }

  const lowerRuleId = ruleId.toLowerCase();
  const matchedKey = Object.keys(rulesConfig).find((key) =>
  {
    return key.toLowerCase() === lowerRuleId;
  });

  return matchedKey ? rulesConfig[matchedKey] : {};
}

/**
 * Resolves the absolute path to the configuration file.
 * @param {string} rootDir - Project root directory.
 * @param {string|null} customConfigPath - Custom path provided via options.
 * @returns {string|null} Resolved config file path or null.
 */
function resolveConfigPath(rootDir, customConfigPath)
{
  const resolved = customConfigPath ? path.resolve(rootDir, customConfigPath) : null;
  if (resolved && fs.existsSync(resolved))
  {
    return resolved;
  }
  return findConfigFile(rootDir);
}

/**
 * Loads and parses JSON config from file path.
 * @param {string|null} configPath - Absolute path to config file.
 * @returns {object} Loaded configuration object.
 */
function loadConfig(configPath)
{
  if (configPath && fs.existsSync(configPath))
  {
    const configRaw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configRaw);
  }
  return { rules: {} };
}

/**
 * Evaluates rules against a single target file.
 * @param {string} filePath - Path of the file to lint.
 * @param {Map} loadedRules - Loaded lint rules map.
 * @param {object} rulesConfig - Active configuration rules map.
 * @returns {boolean} True if issues were found.
 */
function processFile(filePath, loadedRules, rulesConfig)
{
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(IGNORE_TAG))
  {
    return false;
  }

  const lines = content.split(/\r?\n/);
  let fileHasErrors = false;

  for (const [ruleId, ruleObj] of loadedRules.entries())
  {
    const ruleConfig = getRuleConfig(rulesConfig, ruleId);
    const defaultSeverity = ruleObj.meta.defaultSeverity || DEFAULT_FALLBACK_SEVERITY;
    const defaultEnabled = ruleObj.meta.defaultEnabled !== false;
    const isEnabled = ruleConfig.enabled !== undefined ? ruleConfig.enabled : defaultEnabled;

    if (!isEnabled)
    {
      continue;
    }

    const severity = ruleConfig.severity || defaultSeverity;
    const issues = ruleObj.run(content, lines);

    for (const issue of issues)
    {
      fileHasErrors = true;
      const msg = `${filePath}:${issue.line}:${issue.column} - [${severity}] ${issue.message} (${ruleId})\n`;
      process.stdout.write(msg);
    }
  }

  return fileHasErrors;
}

/**
 * Runs the GML linter over the target project files.
 * @param {string|null} customConfigPath - Path provided by --config, if present.
 * @returns {Promise<boolean>} True if linting completed with no errors, false otherwise.
 */
export async function runEngine(customConfigPath)
{
  const rootDir = process.cwd();
  const resolvedConfigPath = resolveConfigPath(rootDir, customConfigPath);
  const config = loadConfig(resolvedConfigPath);

  const rulesPath = path.join(import.meta.dirname, RULE_DIR_NAME);
  const loadedRules = await loadRules(rulesPath);
  const gmlFiles = findGmlFiles(rootDir);

  let hasErrors = false;

  for (const filePath of gmlFiles)
  {
    if (processFile(filePath, loadedRules, config.rules))
    {
      hasErrors = true;
    }
  }

  return !hasErrors;
}