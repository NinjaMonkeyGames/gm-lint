'use strict';

import { isFunctionLike } from './_util.js';

// break may exit any of these. Per the GameMaker manual, `with` counts as
// a loop for this purpose (it's implemented as one internally), and
// `switch` accepts break the same way it does in C/JS.
const BREAK_TARGETS = new Set([
  'ForStatement', 'WhileStatement', 'DoUntilStatement', 'RepeatStatement',
  'WithStatement', 'SwitchStatement',
]);

export default {
  id: 'GM1000',
  meta: {
    description:
      'No enclosing loop from which to break. \'break\' must appear inside the body of a ' +
      'loop (for/while/do-until/repeat/with) or a switch statement - using it anywhere ' +
      'else is a compile error in GameMaker.',
    severity: 'error',
  },
  /**
   * Creates the lint rule visitor handlers for detecting break statements
   * with no valid enclosing loop or switch.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context)
  {
    return {
      /**
       * Walks up from a break statement looking for a qualifying ancestor
       * before hitting a function boundary.
       * @param {object} node - The BreakStatement node being visited.
       * @param {object} parent - The immediate parent node.
       * @param {object[]} ancestors - Ancestors of `node`, root first.
       * @returns {void}
       */
      BreakStatement(node, parent, ancestors)
      {
        for (let i = ancestors.length - 1; i >= 0; i--)
        {
          const anc = ancestors[i];
          // A break can't reach past a function boundary to an outer loop.
          if (isFunctionLike(anc))
          {
            break;
          }
          if (BREAK_TARGETS.has(anc.type))
          {
            return; // valid
          }
        }
        context.report({
          node,
          message: 'No enclosing loop from which to break. Remove this \'break\' or move it ' +
            'inside a for/while/do-until/repeat/with loop or a switch statement.',
        });
      },
    };
  },
};
