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

/**
 * Determines if a function-like node is an inline callback expression 
 * (e.g. passed into a method or function call) rather than a standalone declaration.
 * @param {object} anc - The ancestor function node.
 * @param {object[]} ancestors - The full ancestor array.
 * @param {number} index - The current index of the ancestor in the array.
 * @returns {boolean} True if it acts as an inline callback.
 */
function isInlineCallback(anc, ancestors, index) 
{
  if (anc.type !== 'FunctionExpression') 
  {
    return false;
  }
  const parent = ancestors[index + 1];
  return parent && (parent.type === 'CallExpression' || parent.type === 'Property');
}

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

          // 1. If it's a valid loop target, we are good!
          if (CONTINUE_TARGETS.has(anc.type))
          {
            foundLoop = true;
            break; 
          }

          // 2. If it's a function boundary, check if it's a transparent inline callback
          if (isFunctionLike(anc))
          {
            if (isInlineCallback(anc, ancestors, i))
            {
              continue; // transparent, keep scanning outward
            }
            break; // true function boundary, stop scanning
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