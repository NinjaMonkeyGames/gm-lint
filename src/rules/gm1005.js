'use strict';

/**
 * Built-in or known function definitions specifying their minimum required argument counts.
 */
const MIN_REQUIRED_ARGS = {
  draw_set_color: 1,
};

/**
 * GM1005: Argument must be provided.
 * A function's parameter is required, yet an argument was not passed.
 */
export default {
  id: 'GM1005',
  meta: {
    description: 'A required argument was omitted in a function call.',
    severity: 'error',
  },
  /**
   * Creates the lint rule visitor handlers for detecting missing required function arguments.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context) 
  {
    return {
      CallExpression(node) 
      {
        let funcName = null;

        // Support both direct identifiers and member expressions (e.g., utility.draw_set_color())
        if (node.callee) 
        {
          if (node.callee.type === 'Identifier') 
          {
            funcName = node.callee.name;
          } 
          else if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') 
          {
            funcName = node.callee.property.name;
          }
        }

        if (funcName) 
        {
          const minArgs = MIN_REQUIRED_ARGS[funcName];

          if (minArgs !== undefined && node.arguments.length < minArgs) 
          {
            context.report({
              node,
              message: `Argument must be provided for function '${funcName}'.`,
            });
          }
        }
      },
    };
  },
};