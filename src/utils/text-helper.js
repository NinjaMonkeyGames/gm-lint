/**
 * @file Utility helpers for parsing, cleaning, and validating GML text lines.
 */

/**
 * Checks if a trimmed line is entirely a comment.
 * @param {string} trimmedLine - The trimmed line text.
 * @returns {boolean} True if the line is a pure comment.
 */
export function isPureComment(trimmedLine)
{
  return trimmedLine.startsWith('//') || trimmedLine.startsWith('/*');
}

/**
 * Strips trailing single-line comments from a line of code.
 * @param {string} lineText - The raw line text.
 * @returns {string} The code segment with comments removed.
 */
export function stripInlineComment(lineText)
{
  return lineText.split('//')[0].trim();
}