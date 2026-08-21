'use strict';

const TERMINATORS = new Set(['ReturnStatement', 'BreakStatement', 'ContinueStatement', 'ExitStatement', 'ThrowStatement']);

// Not an official Feather GM-numbered rule (Feather doesn't publish a
// stable ID for this one), but it mirrors the "unreachable code" warning
// the GameMaker editor's static analysis gives you[cite: 13].
export default {
  id: 'no-unreachable-code',
  meta: {
    description: 'Statements after return/break/continue/exit/throw in the same block can never run.',
    severity: 'warning',
  },
  /**
   * Creates the lint rule visitor handlers for detecting unreachable code blocks.
   * @param {object} context - The linting context providing reporting utilities.
   * @returns {object} An object mapping AST node types to visitor functions.
   */
  create(context) 
  {
    return {
      BlockStatement(node) 
      {
        let terminatedAt = -1;
        node.body.forEach((stmt, index) => 
        {
          if (terminatedAt === -1 && TERMINATORS.has(stmt.type)) 
          {
            terminatedAt = index;
          }
          else if (terminatedAt !== -1 && stmt.type !== 'EmptyStatement') 
          {
            context.report({ node: stmt, message: 'Unreachable code detected.' });
          }
        });
      },
    };
  },
};