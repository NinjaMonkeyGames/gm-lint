'use strict';

/**
 * @file ESLint rule to disallow non-integer assignments in enum declarations.
 * @remarks GameMaker equivalent check for enum member initialization values[cite: 13].
 */

/**
 * Checks if an AST expression node evaluates to or represents a valid integer or reference.
 * @param {object} node - The AST node to check.
 * @returns {boolean} True if it's a valid integer expression or constant reference.
 */
function isIntegerExpression(node)
{
  if (!node)
  {
    return true; // No initializer (implicit integer increment) is valid[cite: 13]
  }

  // Direct integer literal (e.g., 5, -1, 2.0 where Number.isInteger is true)[cite: 13]
  if (node.type === 'Literal' && typeof node.value === 'number' && Number.isInteger(node.value))
  {
    return true;
  }

  // Identifiers or MemberExpressions can be references to other enums, macros, or built-in constants[cite: 13]
  if (node.type === 'Identifier' || node.type === 'MemberExpression')
  {
    return true;
  }

  // Parenthesized expressions wrapping a valid integer or reference[cite: 13]
  if (node.type === 'ParenthesizedExpression')
  {
    return isIntegerExpression(node.expression);
  }

  // Unary expression for signed integers or bitwise negation (e.g., -5, +5, ~0)[cite: 13]
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '-' || node.operator === '+' || node.operator === '~')
  )
  {
    return isIntegerExpression(node.argument);
  }

  // Binary expression for arithmetic/bitwise operations[cite: 13]
  if (node.type === 'BinaryExpression')
  {
    const validOperators = new Set(['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^', 'div', 'mod']);
    if (validOperators.has(node.operator))
    {
      return isIntegerExpression(node.left) && isIntegerExpression(node.right);
    }
  }

  return false;
}

export default {
  id: 'GM1003',
  meta: {
    description:
      'Enum assignment must be integer assignment. Enum member values must be integers; ' +
      'assigning non-integer values (like strings or floats) is a compile error in GameMaker.',
    severity: 'error',
  },

  /**
   * Creates the ESLint rule visitor.
   * @public
   * @param {import('eslint').Rule.RuleContext} context - The ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} The rule listener methods.
   */
  create(context)
  {
    return {
      /**
       * Validates enum member initialization values.
       * @public
       * @param {import('estree').EnumDeclaration} node - The enum declaration node.
       * @returns {void}
       */
      EnumDeclaration(node)
      {
        for (const member of node.members)
        {
          const init = member.init;
          if (!init)
          {
            continue;
          }

          if (!isIntegerExpression(init))
          {
            context.report({
              node: init,
              message: `Enum assignment for '${member.name}' must be an integer assignment.`,
            });
          }
        }
      },
    };
  },
};