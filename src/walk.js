'use strict';

/**
 * Generic AST traversal. Because our parser produces a plain, predictable
 * tree (every node is `{ type, loc, ...fields }`), we don't need a
 * hand-maintained "visitor keys" table like estraverse does - we just walk
 * every enumerable property and recurse into anything that looks like a
 * node or an array of nodes.
 */
function isNode(value) {
  return value && typeof value === 'object' && typeof value.type === 'string';
}

function walk(node, visitors, parent = null, ancestors = []) {
  if (!isNode(node)) return;

  const enter = visitors[node.type];
  if (typeof enter === 'function') enter(node, parent, ancestors);
  if (typeof visitors['*'] === 'function') visitors['*'](node, parent, ancestors);

  const nextAncestors = ancestors.concat(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'type' || key === 'errors' || key === 'comments') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) walk(item, visitors, node, nextAncestors);
      }
    } else if (isNode(value)) {
      walk(value, visitors, node, nextAncestors);
    }
  }
}

module.exports = { walk, isNode };
