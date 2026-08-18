/**
 * @file Utility helper for scanning and validating scopes line by line.
 */

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
    const trimmed = lineText.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('/*'))
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

    for (const char of trimmed)
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