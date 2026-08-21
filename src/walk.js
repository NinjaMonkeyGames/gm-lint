'use strict';

/**
 * Generic AST traversal. Because our parser produces a plain, predictable
 * tree (every node is `{ type, loc, ...fields }`), we don't need a
 * hand-maintained "visitor keys" table like estraverse does - we just walk
 * every enumerable property and recurse into anything that looks like a
 * node or an array of nodes[cite: 6].
 * @param {any} value - The value to check.
 * @returns {boolean} True if the value represents an AST node.
 */
function isNode(value) 
{
  return value && typeof value === 'object' && typeof value.type === 'string';
}

/**
 * Recursively traverses an AST node and its children, invoking visitor functions.
 * @param {object} node - The current AST node being traversed.
 * @param {object} visitors - An object containing visitor functions mapped by node type or '*' for all nodes.
 * @param {object|null} [parent] - The parent node of the current node.
 * @param {object[]} [ancestors] - An array containing all ancestor nodes up to the root.
 * @returns {void}
 */
function walk(node, visitors, parent = null, ancestors = []) 
{
  if (!isNode(node)) 
  {
    return;
  }

  const enter = visitors[node.type];
  if (typeof enter === 'function') 
  {
    enter(node, parent, ancestors);
  }
  if (typeof visitors['*'] === 'function') 
  {
    visitors['*'](node, parent, ancestors);
  }

  const nextAncestors = ancestors.concat(node);
  for (const key of Object.keys(node)) 
  {
    if (key === 'loc' || key === 'type' || key === 'errors' || key === 'comments') 
    {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) 
    {
      for (const item of value) 
      {
        if (isNode(item)) 
        {
          walk(item, visitors, node, nextAncestors);
        }
      }
    }
    else if (isNode(value)) 
    {
      walk(value, visitors, node, nextAncestors);
    }
  }
}

export { walk, isNode };