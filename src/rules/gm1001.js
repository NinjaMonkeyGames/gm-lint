'use strict';

/**
 * @file ESLint rule to disallow continue statements outside of loops.
 * @remarks GameMaker equivalent check for continue validity.
 */

import { isFunctionLike } from './_util.js';

/**
 * Continue targets accepted by GameMaker.
 * @type {Set<string>}
 * @constant
 */
const CONTINUE_TARGETS = new Set([
  'ForStatement',
  'WhileStatement',
  'DoUntilStatement',
  'RepeatStatement',
  'WithStatement',
]);

export default {
  id: 'GM1001',
  meta: {
    description:
      'No enclosing loop from which to continue. \'continue\' must appear inside the body of a ' +
      'loop (for/while/do-until/repeat/with).',
    severity: 'error',
  },

  /**
   * Creates the rule visitor.
   * @public
   * @param {object} context - The lint rule context.
   * @returns {object} The rule listener methods.
   */
  create(context)
  {
    return {
      /**
       * Validates continue statement placements.
       * @public
       * @param {object} node - The continue node.
       * @param {object} parent - The parent node.
       * @param {object[]} ancestors - The ancestor nodes.
       * @returns {void}
       */
      ContinueStatement(node, parent, ancestors)
      {
        let foundLoop = false;

        for (let i = ancestors.length - 1; i >= 0; i--)
        {
          const anc = ancestors[i];

          // 1. If it's a valid loop target reached without crossing a
          // function boundary, we are good!
          if (CONTINUE_TARGETS.has(anc.type))
          {
            foundLoop = true;
            break; 
          }

          // 2. A function boundary (including IIFEs/inline callbacks) always
          // stops the search - 'continue' can never reach outside the
          // function it's lexically written in.
          if (isFunctionLike(anc))
          {
            break;
          }

          // 3. For everything else (SwitchStatement, SwitchCase, BlockStatement, etc.), 
          // do nothing and let the loop continue walking upward.
        }

        if (!foundLoop)
        {
          context.report({
            node,
            message: 'No enclosing loop from which to continue. Remove this \'continue\' or move it ' +
              'inside a for/while/do-until/repeat/with loop.',
          });
        }
      },
    };
  },
};