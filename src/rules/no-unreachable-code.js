'use strict';

const TERMINATORS = new Set(['ReturnStatement', 'BreakStatement', 'ContinueStatement', 'ExitStatement', 'ThrowStatement']);

// Not an official Feather GM-numbered rule (Feather doesn't publish a
// stable ID for this one), but it mirrors the "unreachable code" warning
// the GameMaker editor's static analysis gives you[cite: 7].
export default {
  id: 'no-unreachable-code',
  meta: {
    description: 'Statements after return/break/continue/exit/throw in the same block can never run.',
    severity: 'warning',
  },
  /**
   *
   * @param context
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