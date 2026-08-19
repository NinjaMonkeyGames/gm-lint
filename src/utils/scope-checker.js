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
  let cleaned = lineText.replace(/\/\*.*?\*\//g, ' ');
  cleaned = cleaned.split('//')[0];
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, '""');
  cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, "''");
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
  let scopeDepth = 0;
  let pendingSingleStatement = false;

  lines.forEach((lineText, index) =>
  {
    const lineNumber = index + 1;
    const cleaned = cleanCodeLine(lineText);
    const trimmed = cleaned.trim();

    if (!trimmed)
    {
      return;
    }

    // Check target keyword on this line while the current scope is still valid
    const targetRegex = new RegExp(`^\\b${targetKeyword}\\b`);
    const hasTarget = targetRegex.test(trimmed);

    const regex = allowSwitch 
      ? /\b(for|while|repeat|with|do|switch)\b/ 
      : /\b(for|while|repeat|with|do)\b/;

    let openedLoopOrSwitch = false;
    if (regex.test(trimmed))
    {
      scopeDepth++;
      openedLoopOrSwitch = true;
    }

    const hasOpeningBrace = cleaned.includes('{');
    const hasClosingBrace = cleaned.includes('}');

    if (openedLoopOrSwitch && !hasOpeningBrace)
    {
      pendingSingleStatement = true;
    }

    // Adjust scope depth based on explicit braces
    for (const char of cleaned)
    {
      if (char === '{')
      {
        pendingSingleStatement = false;
      }
      else if (char === '}')
      {
        if (scopeDepth > 0)
        {
          scopeDepth--;
        }
      }
    }

    // Evaluate target keyword validity under the current scope depth
    if (hasTarget)
    {
      if (scopeDepth === 0)
      {
        issues.push({ line: lineNumber, message: errorMessage });
      }
    }

    // Close pending single-statement scope after evaluating the line
    if (pendingSingleStatement && !hasOpeningBrace && !hasClosingBrace && (trimmed.endsWith(';') || trimmed === targetKeyword))
    {
      pendingSingleStatement = false;
      if (scopeDepth > 0)
      {
        scopeDepth--;
      }
    }
  });

  return issues;
}