'use strict';

/**
 * @file ESLint rule to flag invalid arithmetic operations on bitfield constants and asset IDs (GM1009).
 * @remarks GameMaker Language lint rule for type safety approximations.
 */

// GML constants meant to be combined as bit flags (e.g. file_find_first
// attributes). Feather's real Strict Type checker knows every constant's
// declared "type" project-wide; we only recognize this well-known,
// documented set of bitfield flags without full type inference[cite: 20].
const BITFIELD_FLAG_CONSTANTS = new Set([
  'fa_readonly', 'fa_hidden', 'fa_sysfile', 'fa_volumeid', 'fa_directory', 'fa_archive',
]);

// Built-in variables that hold an asset ID where the *ordering* of that ID
// is not something you're meant to rely on - arithmetic on them is the
// classic "room + 1" mistake the manual calls out[cite: 20].
const ASSET_ID_VARIABLES = new Map([
  ['room', 'room_goto_next() / room_goto_previous() / room_goto(<explicit room>)'],
]);

const ARITHMETIC_OPERATORS = new Set(['+', '-']);

/**
 * Checks if an AST node is a bare reference to a known bitfield flag constant.
 * @param {object} node - The AST node to check.
 * @returns {boolean} True if the node is a bitfield constant identifier.
 */
function isBitfieldConstant(node) 
{
  return node.type === 'Identifier' && BITFIELD_FLAG_CONSTANTS.has(node.name);
}

/**
 * Checks if an AST node is a bare reference to a known asset-ID variable.
 * @param {object} node - The AST node to check.
 * @returns {boolean} True if the node is an asset-ID variable identifier.
 */
function isAssetIdVariable(node) 
{
  return node.type === 'Identifier' && ASSET_ID_VARIABLES.has(node.name);
}

/**
 * Reports a bitfield-flag misuse, e.g., combining flags with addition instead of bitwise OR.
 * @param {object} context - The lint rule context.
 * @param {object} node - The binary expression AST node.
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
 * Reports an asset-ID arithmetic misuse, e.g., adding or subtracting from the `room` variable.
 * @param {object} context - The lint rule context.
 * @param {object} node - The binary expression AST node.
 * @param {string} name - The asset ID variable name.
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

module.exports = {
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
   * Creates the ESLint rule visitor.
   * @public
   * @param {object} context - The lint rule context.
   * @returns {object} The rule listener methods.
   */
  create(context) 
  {
    return {
      /**
       * Validates binary expressions for illegal arithmetic on bitfields or asset IDs.
       * @public
       * @param {object} node - The BinaryExpression AST node.
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