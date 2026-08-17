/** @type {{ defaultSeverity: string, defaultEnabled: boolean }} */
export const meta = {
  defaultSeverity: 'warning',
  defaultEnabled: true,
};

/**
 * Lints GML code for global variable declarations.
 * @param {string} content - Full file text.
 * @param {string[]} lines - File split by line breaks.
 * @returns {Array<{line: number, column: number, message: string}>} Found issues.
 */
export default function checkNoGlobalVars(content, lines)
{
  const issues = [];
  const COLUMN_OFFSET = 1;
  const INDEX_OFFSET = 1;

  lines.forEach((lineText, lineIdx) =>
  {
    const matchPos = lineText.indexOf('global.');
    if (matchPos !== -1)
    {
      issues.push({
        line: lineIdx + INDEX_OFFSET,
        column: matchPos + COLUMN_OFFSET,
        message: 'Avoid using global variables directly.',
      });
    }
  });

  return issues;
}