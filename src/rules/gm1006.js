'use strict';

/**
 * @file Rule to check for duplicate enum declarations project-wide (GM1006).
 * @remarks GameMaker Language lint rule.
 */

// Shared project-wide store for tracking enums across multiple files in a single lint run
const projectEnums = new Map(); // Map<enumName, filename>

export default {
  id: 'GM1006',
  meta: {
    severity: 'error',
    description: "The enum '{name}' has already been previously declared in the project.",
  },
  
  /**
   * Creates the AST visitor for checking duplicate enums project-wide.
   * @param {object} context - The lint context object.
   * @returns {object} The AST visitor handlers.
   */
  create(context) 
  {
    const filename = context.filename || context.getFilename();

    return {
      EnumDeclaration(node) 
      {
        const enumName = node.id && node.id.name ? node.id.name : node.name;
        
        if (enumName) 
        {
          if (projectEnums.has(enumName)) 
          {
            const firstDeclaredFile = projectEnums.get(enumName);
            // Only report if it's declared elsewhere (or handle re-linting cleanups if needed)
            context.report({
              node,
              message: `The enum '${enumName}' has already been previously declared in ${firstDeclaredFile}.`,
            });
          } 
          else 
          {
            projectEnums.set(enumName, filename);
          }
        }
      },
    };
  },
};