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
  // eslint-disable-next-line quotes
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
  const scopeStack = [];

  lines.forEach((lineText, index) =>
  {
    const lineNumber = index + 1;
    const cleaned = cleanCodeLine(lineText);
    const trimmed = cleaned.trim();

    if (!trimmed)
    {
      return;
    }

    const targetRegex = new RegExp(`^\\b${targetKeyword}\\b`);
    const hasTarget = targetRegex.test(trimmed);

    const regex = allowSwitch 
      ? /\b(for|while|repeat|with|do|switch)\b/ 
      : /\b(for|while|repeat|with|do)\b/;

    const hasKeyword = regex.test(trimmed);
    const hasOpeningBrace = cleaned.includes('{');
    const hasClosingBrace = cleaned.includes('}');

    // Push a new scope onto the stack when a loop/switch keyword is encountered
    if (hasKeyword)
    {
      scopeStack.push({
        braced: hasOpeningBrace,
        singleRemaining: !hasOpeningBrace
      });
    }

    // Evaluate target keyword validity under the current scope stack
    if (hasTarget)
    {
      if (scopeStack.length === 0)
      {
        issues.push({ line: lineNumber, message: errorMessage });
      }
    }

    // Adjust scope tracking based on explicit braces
    for (const char of cleaned)
    {
      if (char === '{')
      {
        if (scopeStack.length > 0)
        {
          const top = scopeStack[scopeStack.length - 1];
          if (top.singleRemaining)
          {
            top.braced = true;
            top.singleRemaining = false;
          }
        }
      }
      else if (char === '}')
      {
        while (scopeStack.length > 0)
        {
          const popped = scopeStack.pop();
          if (popped.braced)
          {
            break;
          }
        }
      }
    }

    // When a statement terminates (e.g., ends with ';'), pop all consecutive pending single-statement scopes
    if (!hasOpeningBrace && !hasClosingBrace && (trimmed.endsWith(';') || trimmed === targetKeyword || /^[a-zA-Z0-9_]+\+\+;|--;|[a-zA-Z0-9_]+\s*=.+;/.test(trimmed)))
    {
      while (scopeStack.length > 0)
      {
        const top = scopeStack[scopeStack.length - 1];
        if (top.singleRemaining)
        {
          scopeStack.pop();
        }
        else
        {
          break;
        }
      }
    }
  });

  return issues;
}