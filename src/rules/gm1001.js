import { checkLoopOrSwitchStatements } from '../utils/scope-checker.js';

export default {
  id: 'GM1001',
  description: 'The keyword continue must be used inside the body of a loop statement.',
  meta: { requiresComments: false },
  createLineBased(lines, filePath, report) 
  {
    const violations = checkLoopOrSwitchStatements(
      lines, 
      'continue', 
      'GM1001: No enclosing loop from which to continue.', 
      false // allowSwitch = false
    );
    violations.forEach(v => report(v.message, v.line));
  }
};