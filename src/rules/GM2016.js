'use strict';

import path from 'path';
import { collectDeclaredNames, enclosingFunction } from './_util.js';

/**
 * Real Feather knows which object event a file belongs to. We only have a
 * filename, so we use GameMaker's own export convention
 * (`Object_<name>_Event_<event>.gml` / anything containing "Create") as a
 * heuristic for "this is the Create event". Everywhere else, a bare
 * top-level assignment that implicitly declares an instance variable gets
 * flagged, matching GM2016's intent.
 * @param {string} filename - The file path being linted.
 * @returns {boolean} True if the filename looks like a Create event file.
 */
function looksLikeCreateEvent(filename)
{
  return /create/i.test(path.basename(filename));
}

export default {
  id: 'GM2016',
  meta: {
    description:
      'Instance variable declared outside of the Create event. Declare it with \'var\' ' +
      '(if local) or move the initialization into the Create event so its type is ' +
      'knowable up front.',
    severity: 'warning',
  },
  /**
   * Creates the lint rule visitor handlers for detecting instance
   * variables assigned outside the Create event.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context)
  {
    if (looksLikeCreateEvent(context.filename))
    {
      return {};
    }

    return {
      /**
       * Flags a bare top-level assignment (outside any function) whose
       * target name was never declared with var/static at file scope.
       * @param {object} node - The AssignmentExpression node being visited.
       * @param {object} parent - The immediate parent node.
       * @param {object[]} ancestors - Ancestors of `node`, root first.
       * @returns {void}
       */
      AssignmentExpression(node, parent, ancestors)
      {
        if (node.left.type !== 'Identifier')
        {
          return;
        }
        if (enclosingFunction(ancestors))
        {
          return; // handled by GM1013 inside functions
        }

        const name = node.left.name;
        const program = ancestors[0];
        const declared = collectDeclaredNames(program);

        if (!declared.has(name))
        {
          context.report({
            node: node.left,
            message: `Instance variable '${name}' declared outside of Create event. ` +
              'Declare it with \'var\' or move it to the Create event.',
          });
        }
      },
    };
  },
};
