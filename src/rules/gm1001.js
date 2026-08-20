'use strict';

const { isFunctionLike } = require('./_util');

// Unlike break, continue is transparent through switch: `continue` inside
// a switch-inside-a-loop continues the loop, so SwitchStatement is not a
// valid target on its own - we just skip over it while searching outward.
const CONTINUE_TARGETS = new Set([
  'ForStatement', 'WhileStatement', 'DoUntilStatement', 'RepeatStatement', 'WithStatement',
]);

module.exports = {
  id: 'GM1001',
  meta: {
    description:
      'No enclosing loop from which to continue. \'continue\' must appear inside the body ' +
      'of a for/while/do-until/repeat/with loop - using it anywhere else (including bare ' +
      'inside a switch with no surrounding loop) is a compile error in GameMaker.',
    severity: 'error',
  },
  /**
   *
   * @param context
   */
  create(context) 
  {
    return {
      ContinueStatement(node, parent, ancestors) 
      {
        for (let i = ancestors.length - 1; i >= 0; i--) 
        {
          const anc = ancestors[i];
          if (isFunctionLike(anc)) 
          {
            break;
          } // can't reach past a function boundary
          if (CONTINUE_TARGETS.has(anc.type)) 
          {
            return;
          } // valid
        }
        context.report({
          node,
          message: 'No enclosing loop from which to continue. Remove this \'continue\' or move ' +
            'it inside a for/while/do-until/repeat/with loop.',
        });
      },
    };
  },
};