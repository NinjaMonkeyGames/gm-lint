'use strict';

/**
 * @file ESLint rule to disallow assignment to read-only built-in variables (GM1008).
 * @remarks GameMaker Language lint rule for read-only built-in variables.
 */

/**
 * Set of known read-only built-in variables in GameMaker.
 * @type {Set<string>}
 * @constant
 */
const READ_ONLY_VARIABLES = new Set([
  'working_directory',
  'temp_directory',
  'game_save_id',
  'game_id',
  'fps',
  'fps_real',
  'room',
  'room_width',
  'room_height',
  'async_load',
  'score',
  'lives',
  'health',
]);

/**
 * Helper to extract the identifier name from an assignment left-hand side.
 * @param {object} node - The left-hand side AST node.
 * @returns {string|null} The variable name if it's a direct identifier.
 */
function getAssignmentVariableName(node) 
{
  if (!node) 
  {
    return null;
  }
  if (node.type === 'Identifier') 
  {
    return node.name;
  }
  if (node.type === 'ParenthesizedExpression') 
  {
    return getAssignmentVariableName(node.expression);
  }
  return null;
}

export default {
  id: 'GM1008',
  meta: {
    description:
      'The variable is readonly and cannot be assigned to. Built-in read-only variables ' +
      'like working_directory cannot have their values directly modified.',
    severity: 'error',
  },

  /**
   * Creates the ESLint rule visitor.
   * @public
   * @param {object} context - The lint rule context.
   * @returns {object} The rule listener methods.
   */
  create(context) 
  {
    return {
      /**
       * Validates assignment expressions to check for mutations of read-only variables.
       * @public
       * @param {object} node - The AssignmentExpression AST node.
       * @returns {void}
       */
      AssignmentExpression(node) 
      {
        const varName = getAssignmentVariableName(node.left);
        if (varName && READ_ONLY_VARIABLES.has(varName)) 
        {
          context.report({
            node: node.left,
            message: `The variable '${varName}' is readonly and cannot be assigned to.`,
          });
        }
      },
    };
  },
};