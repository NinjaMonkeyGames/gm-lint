import { isPureComment, stripInlineComment } from '../utils/text-helper.js';

export default {
  id: 'GM1002',
  description: 'globalvar does not support inline initializers.',
  meta: { requiresComments: false },
  createLineBased(lines, filePath, report)
  {
    lines.forEach((lineText, index) =>
    {
      const lineNumber = index + 1;
      const trimmed = lineText.trim();
      if (isPureComment(trimmed)) return;
      if (/^globalvar\b/.test(trimmed))
      {
        const codePart = stripInlineComment(trimmed);
        const declarationPart = codePart.split(';')[0];
        if (/\b\w+\s*=(?!=)/.test(declarationPart))
        {
          report('GM1002: globalvar does not support inline initializers.', lineNumber);
        }
      }
    });
  }
};