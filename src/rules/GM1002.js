'use strict';

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
   * Creates the lint rule visitor handlers for detecting globalvar
   * declarations with an inline initializer.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context)
  {
    return {
      /**
       * Flags any globalvar declarator that has an inline initializer.
       * @param {object} node - The VariableDeclaration node being visited.
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
