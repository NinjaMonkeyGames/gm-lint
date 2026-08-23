'use strict';

/**
 * @file ESLint rule to disallow invalid left-hand side expressions in assignments (GM1007).
 * @remarks GameMaker Language lint rule for assignment targets.
 */

/**
 * Checks if an expression node is a valid assignable left-hand side.
 * Valid targets include identifiers, member expressions (properties/array accessors),
 * and built-in keywords that represent assignable scopes (e.g., global, self, other).
 * @param {object} node - The AST node to check.
 * @returns {boolean} True if the node is a valid assignment target.
 */
function isValidAssignmentTarget(node) 
{
  if (!node) 
  {
    return false;
  }

  // Identifiers (e.g., _foo) or scope keywords (global, self, other)
  if (node.type === 'Identifier') 
  {
    return true;
  }

  // Member expressions (e.g., obj.prop, struct.key, arr[0])
  if (node.type === 'MemberExpression') 
  {
    return true;
  }

  // Parenthesized valid targets (e.g., (_foo) = 4321)
  if (node.type === 'ParenthesizedExpression') 
  {
    return isValidAssignmentTarget(node.expression);
  }

  return false;
}

export default {
  id: 'GM1007',
  meta: {
    description:
      'Left-hand side of an assignment must be a variable. Constants, function calls, ' +
      'and other non-variables cannot be assigned to.',
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
       * Validates assignment expressions to ensure the left-hand side is a variable.
       * @public
       * @param {object} node - The AssignmentExpression AST node.
       * @returns {void}
       */
      AssignmentExpression(node) 
      {
        if (!isValidAssignmentTarget(node.left)) 
        {
          context.report({
            node: node.left,
            message: 'Left-hand side of an assignment must be a variable.',
          });
        }
      },
    };
  },
};