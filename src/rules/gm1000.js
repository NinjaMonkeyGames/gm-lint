'use strict';

/**
 * @file ESLint rule to disallow break statements outside of loops or switch statements.
 * @remarks GameMaker equivalent check for break validity.
 */

/**
 * Break targets accepted by GameMaker (loops and switch statements).
 * @type {Set<string>}
 * @constant
 */
const BREAK_TARGETS = new Set([
  'ForStatement',
  'WhileStatement',
  'DoUntilStatement',
  'RepeatStatement',
  'WithStatement',
  'SwitchStatement',
]);

export default {
  id: 'GM1000',
  meta: {
    description:
      'No enclosing loop or switch from which to break. \'break\' must appear inside the body ' +
      'of a loop or switch statement - using it anywhere else is a compile error in GameMaker.',
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
       * Validates break statement placements.
       * @public
       * @param {object} node - The break node.
       * @param {object} parent - The parent node.
       * @param {object[]} ancestors - The ancestor nodes.
       * @returns {void}
       */
      BreakStatement(node, parent, ancestors)
      {
        // Traverse backwards through ancestors to find a loop or switch target,
        // completely ignoring function boundaries.
        for (let i = ancestors.length - 1; i >= 0; i--)
        {
          const anc = ancestors[i];

          if (BREAK_TARGETS.has(anc.type))
          {
            return; // Valid loop or switch found enclosing this break statement
          }
        }

        context.report({
          node,
          message: 'No enclosing loop or switch from which to break. Remove this \'break\' or move it ' +
            'inside a loop (for/while/do-until/repeat/with) or switch statement.',
        });
      },
    };
  },
};