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
 * Strips comments from a line of code, including trailing single-line
 * comments ("// ...") and any inline block comments ("/* ... *\/")
 * that appear before, after, or in the middle of the code on the line.
 * Block comments are removed first so that a "//" occurring inside one
 * doesn't get mistaken for the start of a line comment, and so that an
 * "=" or ";" inside a block comment can never be mistaken for real code.
 * @param {string} lineText - The raw line text.
 * @returns {string} The code segment with comments removed.
 */
export function stripInlineComment(lineText)
{
  const withoutBlockComments = lineText.replace(/\/\*.*?\*\//g, ' ');
  return withoutBlockComments.split('//')[0].trim();
}