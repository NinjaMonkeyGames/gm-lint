/**
 * @file Lint rule implementation for GM1002.
 */

import { isPureComment, stripInlineComment } from '../utils/text-helper.js';

/** @type {object} */
export default {
  id: 'GM1002',
  description: 'globalvar does not support inline initializers.',
  meta: {
    requiresComments: false
  },
  /**
   * Executes line-based validations to ensure globalvar declarations do not contain inline initializers.
   * @param {string[]} lines - Array of source file lines.
   * @param {string} filePath - Absolute or relative file path.
   * @param {function(string, number): void} report - Reporting callback to log violations.
   * @returns {void}
   */
  createLineBased(lines, filePath, report)
  {
    lines.forEach((lineText, index) =>
    {
      const lineNumber = index + 1;
      const trimmed = lineText.trim();

      if (isPureComment(trimmed))
      {
        return;
      }

      if (/^globalvar\b/.test(trimmed))
      {
        const codePart = stripInlineComment(trimmed);

        // Check for inline assignment (e.g., globalvar x = 5) 
        // while ensuring it is an assignment operator '=' and not a comparison '=='
        if (/\b\w+\s*=(?!=)/.test(codePart))
        {
          report('GM1002: globalvar does not support inline initializers.', lineNumber);
        }
      }
    });
  }
};