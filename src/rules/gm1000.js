import { checkLoopOrSwitchStatements } from '../utils/scope-checker.js';

export default {
  id: 'GM1000',
  description: 'The keyword break must be used inside the body of a loop statement or switch.',
  meta: { requiresComments: false },
  createLineBased(lines, filePath, report) 
  {
    const violations = checkLoopOrSwitchStatements(
      lines, 
      'break', 
      'GM1000: No enclosing loop or switch from which to break.', 
      true // allowSwitch = true
    );
    violations.forEach(v => report(v.message, v.line));
  }
};