'use strict';

/**
 * @file ESLint rule to disallow duplicate enum member names within the same enum declaration.
 * @remarks GameMaker equivalent check for GM1004.
 */

module.exports = {
  id: 'GM1004',
  meta: {
    description:
      'The enum value \'ENUM MEMBER NAME\' has already been previously defined in the enum \'ENUM NAME\'. ' +
      'Enum members must be uniquely named, duplicate names will result in a Compile Error.',
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
       * Validates unique enum member names within an EnumDeclaration node.
       * @public
       * @param {object} node - The enum declaration AST node.
       * @returns {void}
       */
      EnumDeclaration(node)
      {
        const enumName = node.id ? node.id.name : '<anonymous>';
        const seenMembers = new Set();

        for (const member of node.members)
        {
          const memberName = member.name;
          if (!memberName)
          {
            continue;
          }

          if (seenMembers.has(memberName))
          {
            context.report({
              node: member,
              message: `The enum value '${memberName}' has already been previously defined in the enum '${enumName}'.`,
            });
          }
          else
          {
            seenMembers.add(memberName);
          }
        }
      },
    };
  },
};