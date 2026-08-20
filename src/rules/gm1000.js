'use strict';

const { isFunctionLike } = require('./_util');

// break may exit any of these. Per the GameMaker manual, `with` counts as
// a loop for this purpose (it's implemented as one internally), and
// `switch` accepts break the same way it does in C/JS.
const BREAK_TARGETS = new Set([
  'ForStatement', 'WhileStatement', 'DoUntilStatement', 'RepeatStatement',
  'WithStatement', 'SwitchStatement',
]);

module.exports = {
  id: 'GM1000',
  meta: {
    description:
      "No enclosing loop from which to break. 'break' must appear inside the body of a " +
      "loop (for/while/do-until/repeat/with) or a switch statement - using it anywhere " +
      'else is a compile error in GameMaker.',
    severity: 'error',
  },
  create(context) {
    return {
      BreakStatement(node, parent, ancestors) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
          const anc = ancestors[i];
          // A break can't reach past a function boundary to an outer loop.
          if (isFunctionLike(anc)) break;
          if (BREAK_TARGETS.has(anc.type)) return; // valid
        }
        context.report({
          node,
          message: "No enclosing loop from which to break. Remove this 'break' or move it " +
            'inside a for/while/do-until/repeat/with loop or a switch statement.',
        });
      },
    };
  },
};