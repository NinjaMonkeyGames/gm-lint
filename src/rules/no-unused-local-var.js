'use strict';

/**
 * @file ESLint rule to flag unused local variables declared with 'var' or 'static'.
 * @remarks GameMaker equivalent scope checker for unused variables.
 */

import { walk, isNode } from '../walk.js';
import { isFunctionLike } from './_util.js';

/**
 * Declarators declared directly in scopeNode, not inside nested functions.
 * @param {import('estree').Node} scopeNode - The scope node to inspect.
 * @returns {import('estree').VariableDeclarator[]} The list of shallow variable declarators.
 */
function shallowDeclarators(scopeNode)
{
  const declarators = [];
  
  /**
   * Recursively visits nodes to collect shallow declarators.
   * @param {import('estree').Node} node - The current node to visit.
   * @returns {void}
   */
  function visit(node)
  {
    if (!isNode(node))
    {
      return;
    }
    
    if (node.type === 'VariableDeclaration' && (node.kind === 'var' || node.kind === 'static'))
    {
      declarators.push(...node.declarations);
    }
    
    if (isFunctionLike(node) && node !== scopeNode)
    {
      return; // nested scope boundary
    }
    
    for (const key of Object.keys(node))
    {
      if (key === 'loc' || key === 'type')
      {
        continue;
      }
      
      const value = node[key];
      if (Array.isArray(value))
      {
        value.forEach(visit);
      }
      else if (isNode(value))
      {
        visit(value);
      }
    }
  }
  
  visit(scopeNode);
  return declarators;
}

/**
 * Checks if an Identifier node is a read reference versus a declaration site or member/struct key.
 * @param {import('estree').Identifier} node - The identifier node.
 * @param {import('estree').Node} parent - The parent node.
 * @returns {boolean} True if it is a read reference, false otherwise.
 */
function isReadReference(node, parent)
{
  if (!parent)
  {
    return true;
  }
  
  if (parent.type === 'VariableDeclarator' && parent.id === node)
  {
    return false;
  }
  
  if (parent.type === 'FunctionDeclaration' && parent.id === node)
  {
    return false;
  }
  
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed)
  {
    return false;
  }
  
  if (parent.type === 'Property' && parent.key === node)
  {
    return false;
  }
  
  return true;
}

/**
 * Counts usages of a specific variable name within a scope node.
 * @param {import('estree').Node} scopeNode - The scope node.
 * @param {string} name - The variable name.
 * @returns {number} The usage count.
 */
function countUsages(scopeNode, name)
{
  let count = 0;
  walk(scopeNode, {
    /**
     * Visits identifier nodes during the walk.
     * @param {import('estree').Identifier} node - The identifier node.
     * @param {import('estree').Node} parent - The parent node.
     * @returns {void}
     */
    Identifier(node, parent)
    {
      if (node.name === name && isReadReference(node, parent))
      {
        count++;
      }
    },
  });
  return count;
}

export default {
  id: 'no-unused-local-var',
  meta: {
    description: 'A \'var\'/\'static\' local is declared but its value is never read again.',
    severity: 'warning',
  },
  
  /**
   * Creates the ESLint rule visitor.
   * @public
   * @param {import('eslint').Rule.RuleContext} context - The ESLint rule context.
   * @returns {import('eslint').Rule.RuleListener} The rule listener methods.
   */
  create(context)
  {
    /**
     * Checks a scope node for unused declarations.
     * @param {import('estree').Node} scopeNode - The scope node to check.
     * @returns {void}
     */
    function checkScope(scopeNode)
    {
      for (const decl of shallowDeclarators(scopeNode))
      {
        const name = decl.id.name;
        if (name.startsWith('_unused'))
        {
          continue; // opt-out convention
        }
        
        if (countUsages(scopeNode, name) === 0)
        {
          context.report({
            node: decl.id,
            message: `'${name}' is declared but its value is never used.`,
          });
        }
      }
    }

    return {
      /**
       * Program visitor.
       * @public
       * @param {import('estree').Program} node - The program node.
       * @returns {void}
       */
      Program(node)
      {
        checkScope(node);
      },
      
      /**
       * FunctionDeclaration visitor.
       * @public
       * @param {import('estree').FunctionDeclaration} node - The function declaration node.
       * @returns {void}
       */
      FunctionDeclaration(node)
      {
        checkScope(node.body);
      },
      
      /**
       * FunctionExpression visitor.
       * @public
       * @param {import('estree').FunctionExpression} node - The function expression node.
       * @returns {void}
       */
      FunctionExpression(node)
      {
        checkScope(node.body);
      },
    };
  },
};