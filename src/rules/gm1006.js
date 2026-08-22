'use strict';

/**
 * @file Rule to check for duplicate enum declarations (GM1006).
 * @remarks GameMaker Language lint rule.
 */

export default {
  id: 'GM1006',
  meta: {
    severity: 'error',
    description: "The enum '{name}' has already been previously declared.",
  },
  /**
   * Creates the AST visitor for checking duplicate enums.
   * @param {object} context - The lint context object.
   * @returns {object} The AST visitor handlers.
   */
  create(context) 
  {
    const declaredEnums = new Set();

    return {
      /**
       * Visits enum declaration nodes in the AST.
       * @param {object} node - The AST node.
       * @returns {void}
       */
      EnumDeclaration(node) 
      {
        const enumName = node.id && node.id.name ? node.id.name : node.name;
        
        if (enumName) 
        {
          if (declaredEnums.has(enumName)) 
          {
            context.report({
              node,
              message: `The enum '${enumName}' has already been previously declared.`,
            });
          } 
          else 
          {
            declaredEnums.add(enumName);
          }
        }
      },
    };
  },
};