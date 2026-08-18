/**
 * @file Core linting engine orchestrating files and rules execution.
 */

/**
 * Lints project code files against a given list of active rules.
 * @param {object} project - The project wrapper object containing codeFiles.
 * @param {Array<object>} rules - Array of imported rule modules.
 * @returns {Array<object>} An array of accumulated issue objects.
 */
export function lintProject(project, rules)
{
  const issues = [];
  const codeFiles = project.codeFiles || [];

  for (const codeAsset of codeFiles)
  {
    const filePath = codeAsset.absolute || codeAsset.name || 'unknown.gml';
    const rawContent = codeAsset.content || '';
    const lines = rawContent.split(/\r?\n/);

    for (const rule of rules)
    {
      if (typeof rule.createLineBased === 'function')
      {
        rule.createLineBased(lines, filePath, (msg, line) =>
        {
          issues.push({
            ruleId: rule.id,
            file: filePath,
            line: line || 1,
            message: msg
          });
        });
      }
    }
  }

  return issues;
}