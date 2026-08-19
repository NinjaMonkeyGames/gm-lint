/**
 * @file Utility helper for scanning and validating scopes line by line.
 */

/**
 * Cleans a line of code by neutralizing string literals and comments
 * to prevent false positives/negatives from braces or keywords inside text data.
 * @param {string} lineText - The raw line text.
 * @returns {string} The cleaned line text.
 */
function cleanCodeLine(lineText)
{
  // 1. Remove block comments
  let cleaned = lineText.replace(/\/\*.*?\*\//g, ' ');
  
  // 2. Remove trailing single-line comments
  cleaned = cleaned.split('//')[0];
  
  // 3. Strip double-quoted and single-quoted string contents
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, '""');
  cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, '\'\'');
  
  return cleaned;
}

/**
 * Validates whether control keywords (break/continue) are correctly scoped inside loops or switches.
 * @param {string[]} lines - Array of text lines from the GML file.
 * @param {string} targetKeyword - The keyword being evaluated (e.g., 'break', 'continue').
 * @param {string} errorMessage - The error message string to report.
 * @param {boolean} [allowSwitch] - Flag indicating if switch scopes satisfy validation.
 * @returns {Array<{line: number, message: string}>} A list of identified rule violations.
 */
export function checkLoopOrSwitchStatements(lines, targetKeyword, errorMessage, allowSwitch = false)
{
  const issues = [];
  let loopSwitchDepth = 0;

  lines.forEach((lineText, index) =>
  {
    const lineNumber = index + 1;
    const cleaned = cleanCodeLine(lineText);
    const trimmed = cleaned.trim();

    if (!trimmed)
    {
      return;
    }

    const regex = allowSwitch 
      ? /\b(for|while|repeat|with|do|switch)\b/ 
      : /\b(for|while|repeat|with|do)\b/;

    if (regex.test(trimmed))
    {
      loopSwitchDepth++;
    }

    for (const char of cleaned)
    {
      if (char === '}')
      {
        if (loopSwitchDepth > 0)
        {
          loopSwitchDepth--;
        }
      }
    }

    const targetRegex = new RegExp(`^\\b${targetKeyword}\\b`);
    if (targetRegex.test(trimmed))
    {
      if (loopSwitchDepth === 0)
      {
        issues.push({ line: lineNumber, message: errorMessage });
      }
    }
  });

  return issues;
}