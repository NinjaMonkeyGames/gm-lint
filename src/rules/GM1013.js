'use strict';

import { collectDeclaredNames, enclosingFunction } from './_util.js';

// A handful of GML built-ins/keywords that behave like variables but are
// never "declared" - assigning to these is normal and shouldn't be flagged.
// This is intentionally a starter list; extend it for your project's needs
// (or replace it with a real GmlSpec.xml-derived list for full coverage).
const BUILTIN_IDENTIFIERS = new Set([
  'self', 'other', 'noone', 'all', 'global', 'x', 'y', 'xstart', 'ystart',
  'xprevious', 'yprevious', 'direction', 'speed', 'hspeed', 'vspeed',
  'friction', 'gravity', 'gravity_direction', 'image_index', 'image_speed',
  'image_xscale', 'image_yscale', 'image_angle', 'image_alpha',
  'image_blend', 'image_number', 'sprite_index', 'sprite_width',
  'sprite_height', 'mask_index', 'object_index', 'id', 'visible', 'solid',
  'persistent', 'depth', 'layer', 'alarm', 'path_index', 'bbox_left',
  'bbox_right', 'bbox_top', 'bbox_bottom', 'argument', 'argument_count',
]);

export default {
  id: 'GM1013',
  meta: {
    description:
      'Reference to a variable which has not been previously declared. Feather flags ' +
      'bare assignments inside functions/methods that silently create an instance ' +
      'variable instead of a local one - declare it with \'var\' if it\'s meant to be local.',
    severity: 'error',
  },
  /**
   * Creates the lint rule visitor handlers for detecting undeclared
   * variable assignments inside a function or method.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context)
  {
    return {
      /**
       * Flags a bare (`=`) assignment inside a function/method whose
       * target name was never declared with var/static or as a param.
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
        if (node.operator !== '=')
        {
          return; // compound ops imply a prior read/decl elsewhere
        }

        const fn = enclosingFunction(ancestors);
        if (!fn)
        {
          return; // top-level bare assignment is GM2016's concern, not GM1013's
        }

        const name = node.left.name;
        if (BUILTIN_IDENTIFIERS.has(name) || name.startsWith('argument'))
        {
          return;
        }

        const params = fn.params.map((p) => p.name);
        const declared = collectDeclaredNames(fn.body, { includeOwnParams: params });
        if (fn.id)
        {
          declared.add(fn.id.name);
        }

        if (!declared.has(name))
        {
          context.report({
            node: node.left,
            message: `Reference to variable '${name}' which has not been previously declared. ` +
              `Declare it with 'var ${name}' if it should be local to this function.`,
          });
        }
      },
    };
  },
};
