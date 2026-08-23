'use strict';

/**
 * @file ESLint rule to disallow inline initializers for globalvar declarations (GM1002).
 * @remarks GameMaker Language lint rule for globalvar initializers.
 */

export default {
  id: 'GM1002',
  meta: {
    description:
      'globalvar does not support inline initializers. \'globalvar x = value;\' is a compile ' +
      'error in GameMaker - split it into a declaration (\'globalvar x;\') followed by a ' +
      'separate assignment (\'x = value;\').',
    severity: 'error',
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
       * Validates variable declarations to disallow inline initializers for globalvar.
       * @public
       * @param {object} node - The VariableDeclaration AST node.
       * @returns {void}
       */
      VariableDeclaration(node) 
      {
        if (node.kind !== 'globalvar') 
        {
          return;
        }
        for (const decl of node.declarations) 
        {
          if (decl.init !== null) 
          {
            context.report({
              node: decl.id,
              message: `'globalvar ${decl.id.name}' cannot have an inline initializer. ` +
                `Split it into 'globalvar ${decl.id.name};' followed by ` +
                `'${decl.id.name} = ...;' on its own line.`,
            });
          }
        }
      },
    };
  },
};