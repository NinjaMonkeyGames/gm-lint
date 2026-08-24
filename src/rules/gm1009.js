'use strict';

const BITFIELD_FLAG_CONSTANTS = new Set([
  'fa_readonly', 'fa_hidden', 'fa_sysfile', 'fa_volumeid', 'fa_directory', 'fa_archive',
]);

const ASSET_ID_VARIABLES = new Map([
  ['room', 'room_goto_next() / room_goto_previous() / room_goto(<explicit room>)'],
  ['sprite_index', 'the asset system functions'],
  ['object_index', 'instance functions'],
  ['sound_index', 'audio functions'],
]);

const ARITHMETIC_OPERATORS = new Set(['+', '-', '*', '/', 'div', 'mod']);

function isBitfieldConstant(node) {
  return node.type === 'Identifier' && BITFIELD_FLAG_CONSTANTS.has(node.name);
}

function isAssetIdVariable(node) {
  return node.type === 'Identifier' && ASSET_ID_VARIABLES.has(node.name);
}

/**
 * Infers the primitive type of an expression node using local scope and function return maps.
 * @param {object} node - The AST node to check.
 * @param {Map<string, string>} variableTypes - Map of variable names to inferred types.
 * @param {Map<string, string>} functionReturnTypes - Map of function names to inferred return types.
 * @returns {string|null} The type name ('string', 'number', 'boolean') or null.
 */
function inferNodeType(node, variableTypes, functionReturnTypes) {
  if (!node) {
    return null;
  }
  if (node.type === 'Literal') {
    return typeof node.value;
  }
  if (node.type === 'Identifier') {
    if (variableTypes.has(node.name)) {
      return variableTypes.get(node.name);
    }
  }
  if (node.type === 'CallExpression') {
    let funcName = null;
    if (node.callee && node.callee.type === 'Identifier') {
      funcName = node.callee.name;
    }
    if (funcName && functionReturnTypes.has(funcName)) {
      return functionReturnTypes.get(funcName);
    }
  }
  if (node.type === 'ParenthesizedExpression') {
    return inferNodeType(node.expression, variableTypes, functionReturnTypes);
  }
  return null;
}

/**
 * Scans a function body to infer its return type based on return statements.
 * @param {object} bodyNode - The BlockStatement node of the function.
 * @param {Map<string, string>} variableTypes - Current local variable types.
 * @param {Map<string, string>} functionReturnTypes - Global function return map.
 * @returns {string|null} Inferred return type.
 */
function inferFunctionReturnType(bodyNode, variableTypes, functionReturnTypes) {
  if (!bodyNode || !bodyNode.body) {
    return null;
  }
  for (const statement of bodyNode.body) {
    if (statement.type === 'ReturnStatement' && statement.argument) {
      const type = inferNodeType(statement.argument, variableTypes, functionReturnTypes);
      if (type) {
        return type;
      }
    }
  }
  return null;
}

function reportBitfieldMisuse(context, node) {
  context.report({
    node,
    message: `Operation '${node.operator}' between types 'Constant.GameMaker.Bitfield' and ` +
      `'Constant.GameMaker.Bitfield' may result in unexpected behavior or an error during ` +
      `runtime. Bitfield flag constants should be combined with bitwise OR ('|'), not ` +
      `arithmetic '${node.operator}' - a flag's underlying value could later change to cover ` +
      `more than one bit, silently breaking addition-based combination.`,
  });
}

function reportAssetIdMisuse(context, node, name) {
  context.report({
    node,
    message: `Operation '${node.operator}' between types 'Asset.GameMaker.${name}' and 'Real' ` +
      `may result in unexpected behavior or an error during runtime. '${name}' is an ` +
      `asset ID, and asset IDs are not guaranteed to be sequential in play order - use ` +
      `${ASSET_ID_VARIABLES.get(name)} instead of doing arithmetic on '${name}' directly.`,
  });
}

function reportTypeMismatch(context, node, leftType, rightType) {
  context.report({
    node,
    message: `Operation '${node.operator}' between types '${leftType}' and '${rightType}' ` +
      `may result in unexpected behavior or an error during runtime.`,
  });
}

export default {
  id: 'GM1009',
  meta: {
    description:
      'Operation between types \'TYPE\' and \'TYPE\' may result in unexpected behavior or an ' +
      'error during runtime. Flags bitfields, asset IDs, and inferred literal/function return type mismatches.',
    severity: 'warning',
  },
  create(context) {
    let scopeTypes = new Map();
    let functionReturnTypes = new Map();

    return {
      Program() {
        scopeTypes = new Map();
        functionReturnTypes = new Map();
      },

      // Pre-scan function declarations to register their return types
      FunctionDeclaration(node) {
        if (node.id && node.id.name && node.body) {
          const retType = inferFunctionReturnType(node.body, scopeTypes, functionReturnTypes);
          if (retType) {
            functionReturnTypes.set(node.id.name, retType);
          }
        }
      },

      VariableDeclarator(node) {
        if (node.id && node.id.type === 'Identifier' && node.init) {
          const initType = inferNodeType(node.init, scopeTypes, functionReturnTypes);
          if (initType) {
            scopeTypes.set(node.id.name, initType);
          }
        }
      },

      BinaryExpression(node) {
        if (!ARITHMETIC_OPERATORS.has(node.operator)) {
          return;
        }

        if (isBitfieldConstant(node.left) && isBitfieldConstant(node.right)) {
          reportBitfieldMisuse(context, node);
          return;
        }

        if (isAssetIdVariable(node.left)) {
          reportAssetIdMisuse(context, node, node.left.name);
          return;
        }
        if (isAssetIdVariable(node.right)) {
          reportAssetIdMisuse(context, node, node.right.name);
          return;
        }

        const leftType = inferNodeType(node.left, scopeTypes, functionReturnTypes);
        const rightType = inferNodeType(node.right, scopeTypes, functionReturnTypes);

        if (leftType && rightType && leftType !== rightType) {
          reportTypeMismatch(context, node, leftType, rightType);
        }
      },
    };
  },
};