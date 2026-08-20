'use strict';

const { isNode } = require('../walk');

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression']);

/**
 * Collect every name declared directly within `scopeBody` (var/static
 * declarations, function params, function statement names, for-loop
 * initializers, catch params) WITHOUT descending into nested function
 * bodies - those are their own scope.
 */
function collectDeclaredNames(scopeBody, { includeOwnParams = [] } = {}) {
  const names = new Set(includeOwnParams);

  function visit(node) {
    if (!isNode(node)) return;
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) names.add(decl.id.name);
    } else if (node.type === 'FunctionDeclaration' && node.id) {
      names.add(node.id.name);
      return; // don't descend into the nested function's own scope
    } else if (node.type === 'FunctionExpression') {
      return; // nested scope
    } else if (node.type === 'CatchClause' && node.param) {
      names.add(node.param.name);
    } else if (node.type === 'ForStatement' && node.init) {
      visit(node.init);
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (isNode(value)) visit(value);
    }
  }
  visit(scopeBody);
  return names;
}

function isFunctionLike(node) {
  return isNode(node) && FUNCTION_TYPES.has(node.type);
}

/** Walk up `ancestors` to find the nearest enclosing function-like node, if any. */
function enclosingFunction(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (isFunctionLike(ancestors[i])) return ancestors[i];
  }
  return null;
}

module.exports = { collectDeclaredNames, isFunctionLike, enclosingFunction, FUNCTION_TYPES };
