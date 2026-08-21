'use strict';

/**
 * @file ESLint rule to disallow continue statements outside of loops.
 * @remarks GameMaker equivalent check for continue validity.
 */

const { isFunctionLike } = require('./_util');

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

module.exports = {
  id: 'GM1001',
  meta: {
    description:
      'No enclosing loop from which to continue. \'continue\' must appear inside the body of a ' +
      'loop (for/while/do-until/repeat/with) - using it anywhere else (including inside a switch ' +
      'without a surrounding loop) is a compile error in GameMaker.',
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
       * Validates continue statement placements.
       * @public
       * @param {import('estree').ContinueStatement} node - The continue node.
       * @param {import('estree').Node} parent - The parent node.
       * @param {import('estree').Node[]} ancestors - The ancestor nodes.
       * @returns {void}
       */
      ContinueStatement(node, parent, ancestors)
      {
        for (let i = ancestors.length - 1; i >= 0; i--)
        {
          const anc = ancestors[i];
          // A continue can't reach past a function boundary to an outer loop.
          if (isFunctionLike(anc))
          {
            break;
          }
          if (CONTINUE_TARGETS.has(anc.type))
          {
            return; // valid
          }
        }

        context.report({
          node,
          message: 'No enclosing loop from which to continue. Remove this \'continue\' or move it ' +
            'inside a for/while/do-until/repeat/with loop.',
        });
      },
    };
  },
};