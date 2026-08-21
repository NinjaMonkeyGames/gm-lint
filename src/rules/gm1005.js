'use strict';

/**
 * Built-in or known function definitions specifying their minimum required argument counts.
 * This can be expanded or replaced by an external metadata provider.
 */
const MIN_REQUIRED_ARGS = {
  draw_set_color: 1,
  // Add other built-ins or custom function requirements here as needed
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
        // Ensure the callee is a simple identifier (e.g., draw_set_color())
        if (node.callee && node.callee.type === 'Identifier') 
        {
          const funcName = node.callee.name;
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