'use strict';

const { walk, isNode } = require('../walk');
const { isFunctionLike } = require('./_util');

/** Declarators declared directly in `scopeNode`, not inside nested functions. */
function shallowDeclarators(scopeNode) {
  const declarators = [];
  function visit(node) {
    if (!isNode(node)) return;
    if (node.type === 'VariableDeclaration' && (node.kind === 'var' || node.kind === 'static')) {
      declarators.push(...node.declarations);
    }
    if (isFunctionLike(node) && node !== scopeNode) return; // nested scope boundary
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (isNode(value)) visit(value);
    }
  }
  visit(scopeNode);
  return declarators;
}

/** Is this Identifier node a "read" reference, vs. a declaration site or member/struct key? */
function isReadReference(node, parent) {
  if (!parent) return true;
  if (parent.type === 'VariableDeclarator' && parent.id === node) return false;
  if (parent.type === 'FunctionDeclaration' && parent.id === node) return false;
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return false;
  if (parent.type === 'Property' && parent.key === node) return false;
  return true;
}

function countUsages(scopeNode, name) {
  let count = 0;
  walk(scopeNode, {
    Identifier(node, parent) {
      if (node.name === name && isReadReference(node, parent)) count++;
    },
  });
  return count;
}

module.exports = {
  id: 'no-unused-local-var',
  meta: {
    description: "A 'var'/'static' local is declared but its value is never read again.",
    severity: 'warning',
  },
  create(context) {
    function checkScope(scopeNode) {
      for (const decl of shallowDeclarators(scopeNode)) {
        const name = decl.id.name;
        if (name.startsWith('_unused')) continue; // opt-out convention
        if (countUsages(scopeNode, name) === 0) {
          context.report({
            node: decl.id,
            message: `'${name}' is declared but its value is never used.`,
          });
        }
      }
    }

    return {
      Program(node) { checkScope(node); },
      FunctionDeclaration(node) { checkScope(node.body); },
      FunctionExpression(node) { checkScope(node.body); },
    };
  },
};
