'use strict';

// GML constants meant to be combined as bit flags (e.g. file_find_first
// attributes). Feather's real Strict Type checker knows every constant's
// declared "type" project-wide; we only recognize this well-known,
// documented set of bitfield flags without full type inference.
const BITFIELD_FLAG_CONSTANTS = new Set([
  'fa_readonly', 'fa_hidden', 'fa_sysfile', 'fa_volumeid', 'fa_directory', 'fa_archive',
]);

// Built-in variables that hold an asset ID where the *ordering* of that ID
// is not something you're meant to rely on - arithmetic on them is the
// classic "room + 1" mistake the manual calls out.
const ASSET_ID_VARIABLES = new Map([
  ['room', 'room_goto_next() / room_goto_previous() / room_goto(<explicit room>)'],
]);

const ARITHMETIC_OPERATORS = new Set(['+', '-']);

/**
 * True if this AST node is a bare reference to one of the known bitfield
 * flag constants (e.g. `fa_readonly`).
 * @param {object} node - Candidate operand node.
 * @returns {boolean} Whether the node is a recognized bitfield constant.
 */
function isBitfieldConstant(node)
{
  return node.type === 'Identifier' && BITFIELD_FLAG_CONSTANTS.has(node.name);
}

/**
 * True if this AST node is a bare reference to a built-in asset-ID
 * variable whose numeric value isn't safe to do arithmetic on.
 * @param {object} node - Candidate operand node.
 * @returns {boolean} Whether the node is a recognized asset-ID variable.
 */
function isAssetIdVariable(node)
{
  return node.type === 'Identifier' && ASSET_ID_VARIABLES.has(node.name);
}

/**
 * Report a bitfield-flag misuse, e.g. `fa_readonly + fa_archive`.
 * @param {object} context - The rule's lint context.
 * @param {object} node - The offending BinaryExpression node.
 * @returns {void}
 */
function reportBitfieldMisuse(context, node)
{
  context.report({
    node,
    message: `Operation '${node.operator}' between types 'Constant.GameMaker.Bitfield' and ` +
      '\'Constant.GameMaker.Bitfield\' may result in unexpected behavior or an error during ' +
      'runtime. Bitfield flag constants should be combined with bitwise OR (\'|\'), not ' +
      `arithmetic '${node.operator}' - a flag's underlying value could later change to cover ` +
      'more than one bit, silently breaking addition-based combination.',
  });
}

/**
 * Report an asset-ID arithmetic misuse, e.g. `room + 1`.
 * @param {object} context - The rule's lint context.
 * @param {object} node - The offending BinaryExpression node.
 * @param {string} name - The name of the asset-ID variable involved.
 * @returns {void}
 */
function reportAssetIdMisuse(context, node, name)
{
  context.report({
    node,
    message: `Operation '${node.operator}' between types 'Asset.GameMaker.${name}' and 'Real' ` +
      'may result in unexpected behavior or an error during runtime. \'' + name + '\' is an ' +
      'asset ID, and asset IDs are not guaranteed to be sequential in play order - use ' +
      `${ASSET_ID_VARIABLES.get(name)} instead of doing arithmetic on '${name}' directly.`,
  });
}

export default {
  id: 'GM1009',
  meta: {
    description:
      'Operation between types \'TYPE\' and \'TYPE\' may result in unexpected behavior or an ' +
      'error during runtime. Flags a small set of well-known cases where arithmetic is used ' +
      'on values meant to be treated as opaque - bitfield flag constants (use \'|\' instead of ' +
      '\'+\') and asset-ID variables like \'room\' (use the dedicated navigation functions ' +
      'instead of adding/subtracting from the ID). Real Feather only shows this under Strict ' +
      'Type mode and has full project-wide type inference; this is a narrower, ' +
      'pattern-based approximation of the same two documented cases.',
    severity: 'warning',
  },
  /**
   * Creates the lint rule visitor handlers for detecting risky arithmetic
   * on bitfield-flag constants and asset-ID variables.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context)
  {
    return {
      /**
       * Inspects every binary `+`/`-` expression for the two documented
       * risky-operand patterns.
       * @param {object} node - The BinaryExpression node being visited.
       * @returns {void}
       */
      BinaryExpression(node)
      {
        if (!ARITHMETIC_OPERATORS.has(node.operator))
        {
          return;
        }

        if (isBitfieldConstant(node.left) && isBitfieldConstant(node.right))
        {
          reportBitfieldMisuse(context, node);
          return;
        }

        if (isAssetIdVariable(node.left))
        {
          reportAssetIdMisuse(context, node, node.left.name);
          return;
        }
        if (isAssetIdVariable(node.right))
        {
          reportAssetIdMisuse(context, node, node.right.name);
        }
      },
    };
  },
};
