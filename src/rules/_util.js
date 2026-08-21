'use strict';

import { isNode } from '../walk.js';

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression']);

/**
 * Collect every name declared directly within `scopeBody` (var/static
 * declarations, function params, function statement names, for-loop
 * initializers, catch params) WITHOUT descending into nested function
 * bodies - those are their own scope[cite: 12].
 * @param {object} scopeBody - The AST node representing the function or block scope body.
 * @param {object} [options] - Configuration options.
 * @param {string[]} [options.includeOwnParams] - Additional parameter names to include initially.
 * @returns {Set<string>} A set of declared identifier names.
 */
function collectDeclaredNames(scopeBody, { includeOwnParams = [] } = {}) 
{
  const names = new Set(includeOwnParams);

  function visit(node) 
  {
    if (!isNode(node)) 
    {
      return;
    }
    if (node.type === 'VariableDeclaration') 
    {
      for (const decl of node.declarations) 
      {
        names.add(decl.id.name);
      }
    }
    else if (node.type === 'FunctionDeclaration' && node.id) 
    {
      names.add(node.id.name);
      return; // don't descend into the nested function's own scope[cite: 12]
    }
    else if (node.type === 'FunctionExpression') 
    {
      return; // nested scope[cite: 12]
    }
    else if (node.type === 'CatchClause' && node.param) 
    {
      names.add(node.param.name);
    }
    else if (node.type === 'ForStatement' && node.init) 
    {
      visit(node.init);
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
  visit(scopeBody);
  return names;
}

/**
 * Determines whether an AST node is a function-like declaration or expression.
 * @param {object} node - The AST node to check.
 * @returns {boolean} True if the node is a function declaration or expression.
 */
function isFunctionLike(node) 
{
  return isNode(node) && FUNCTION_TYPES.has(node.type);
}

/**
 * Walk up `ancestors` to find the nearest enclosing function-like node, if any[cite: 12].
 * @param {object[]} ancestors - An array of ancestor AST nodes leading to the current node.
 * @returns {object|null} The enclosing function-like node, or null if none is found.
 */
function enclosingFunction(ancestors) 
{
  for (let i = ancestors.length - 1; i >= 0; i--) 
  {
    if (isFunctionLike(ancestors[i])) 
    {
      return ancestors[i];
    }
  }
  return null;
}

export { collectDeclaredNames, isFunctionLike, enclosingFunction, FUNCTION_TYPES };