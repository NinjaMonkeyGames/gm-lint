'use strict';

/**
 * @file ESLint rule to disallow break statements outside of loops or switch statements.
 * @remarks GameMaker equivalent check for break validity.
 */

const { isFunctionLike } = require('./_util');

/**
 * Break targets accepted by GameMaker.
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

module.exports = {
  id: 'GM1000',
  meta: {
    description:
      'No enclosing loop from which to break. \'break\' must appear inside the body of a ' +
      'loop (for/while/do-until/repeat/with) or a switch statement - using it anywhere ' +
      'else is a compile error in GameMaker.',
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
       * Validates break statement placements.
       * @public
       * @param {import('estree').BreakStatement} node - The break node.
       * @param {import('estree').Node} parent - The parent node.
       * @param {import('estree').Node[]} ancestors - The ancestor nodes.
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