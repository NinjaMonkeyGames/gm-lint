'use strict';

/**
 * @file ESLint rule to disallow break statements outside of loops or switch statements.
 * @remarks GameMaker equivalent check for break validity.
 */

import { isFunctionLike } from './_util.js';

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
        let hasTarget = false;
        let hitFunctionBoundary = false;

        for (let i = ancestors.length - 1; i >= 0; i--)
        {
          const anc = ancestors[i];

          if (BREAK_TARGETS.has(anc.type))
          {
            hasTarget = true;
            break;
          }

          if (isFunctionLike(anc))
          {
            if (isInlineCallback(anc, ancestors, i))
            {
              continue; // Transparent callback, keep looking outward
            }
            hitFunctionBoundary = true;
            break; // Hit a true function boundary
          }
        }

        // Only report an error if we definitively hit a function boundary 
        // without an enclosing loop or switch target.
        if (hitFunctionBoundary && !hasTarget)
        {
          context.report({
            node,
            message: 'No enclosing loop or switch from which to break. Remove this \'break\' or move it ' +
              'inside a loop (for/while/do-until/repeat/with) or switch statement.',
          });
        }
      },
    };
  },
};