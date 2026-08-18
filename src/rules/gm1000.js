/**
 * @file Rule GM1000: Ensures that the `break` keyword is only used within an enclosing loop or switch statement.
 * @module rules/gm1000
 */

/**
 * Metadata for the GM1000 rule.
 * @type {{ defaultSeverity: string, defaultEnabled: boolean }}
 */
export const meta = {
  defaultSeverity: 'warning',
  defaultEnabled: true,
};

/** @type {number} 1-based line index offset. */
const LINE_OFFSET = 1;

/** @type {number} 1-based column index offset. */
const COLUMN_OFFSET = 1;

/** @type {number} Character length of `//` or `/*` markers. */
const COMMENT_MARKER_LENGTH = 2;

/** @type {number} Minimum stack depth containing the root global scope. */
const MIN_STACK_DEPTH = 1;

/** @type {Set<string>} GML keywords that define a valid loop or breakable context. */
const LOOP_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch']);

/** @type {Set<string>} GML keywords that introduce control flow statements. */
const CONTROL_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch', 'if', 'else']);

/** @type {RegExp} Regex matcher for GML tokens including numbers, identifiers, braces, parentheses, and semicolons. */
const TOKEN_REGEX = /\b0x[0-9a-fA-F]+\b|\b\d+(\.\d+)?\b|\b[a-zA-Z_]\w*\b|[{}();]/g;

/**
 * Represents a single scope frame on the analyzer stack.
 * @typedef {object} ScopeFrame
 * @property {'braced' | 'single'} type - The structural type of the scope frame.
 * @property {boolean} isLoop - Whether this scope sits inside a valid breakable loop or switch.
 * @property {number} line - The starting line number of the scope.
 */

/**
 * Represents the state of a pending control construct waiting for headers or bodies.
 * @typedef {object} PendingControlState
 * @property {boolean} isLoop - Whether the pending construct qualifies as a breakable loop/switch context.
 * @property {'WAIT_HEADER' | 'IN_HEADER' | 'WAIT_BODY'} state - The parsing phase of the control construct.
 * @property {number} [targetParenDepth] - Parenthesis depth target for matching header closing parens.
 */

/**
 * Represents a detected diagnostic issue.
 * @typedef {object} LintIssue
 * @property {number} line - Line number of the issue.
 * @property {number} column - Column offset of the issue.
 * @property {string} message - Description of the rule violation.
 */

/**
 * Blanks out a `//` line comment starting at index i, stopping before any line break.
 * @param {string[]} chars - Mutable character array of the source.
 * @param {number} i - Index of the first '/' of the comment marker.
 * @param {number} n - Length of chars array.
 * @returns {number} Index immediately after the blanked comment.
 */
function skipLineComment(chars, i, n) 
{
  chars[i] = ' ';
  chars[i + 1] = ' ';
  i += COMMENT_MARKER_LENGTH;
  while (i < n && chars[i] !== '\n' && chars[i] !== '\r') 
  {
    chars[i++] = ' ';
  }
  return i;
}

/**
 * Blanks out a `/* ... *\/` block comment starting at index i, preserving line breaks.
 * @param {string[]} chars - Mutable character array of the source.
 * @param {number} i - Index of the first '/' of the comment marker.
 * @param {number} n - Length of chars array.
 * @returns {number} Index immediately after the blanked comment.
 */
function skipBlockComment(chars, i, n) 
{
  chars[i] = ' ';
  chars[i + 1] = ' ';
  i += COMMENT_MARKER_LENGTH;
  while (i < n) 
  {
    if (chars[i] === '*' && chars[i + 1] === '/') 
    {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      return i + COMMENT_MARKER_LENGTH;
    }
    if (chars[i] !== '\n' && chars[i] !== '\r') 
    {
      chars[i] = ' ';
    }
    i++;
  }
  return i;
}

/**
 * Blanks out a verbatim string literal (`@"..."` or `@'...'`) starting at index i.
 * @param {string[]} chars - Mutable character array of the source.
 * @param {number} i - Index of the '@' marker.
 * @param {number} n - Length of chars array.
 * @returns {number} Index immediately after the blanked string.
 */
function skipVerbatimString(chars, i, n) 
{
  const quote = chars[i + 1];
  chars[i] = ' ';
  chars[i + 1] = ' ';
  i += COMMENT_MARKER_LENGTH;
  while (i < n) 
  {
    if (chars[i] === quote) 
    {
      chars[i] = ' ';
      return i + 1;
    }
    if (chars[i] !== '\n' && chars[i] !== '\r') 
    {
      chars[i] = ' ';
    }
    i++;
  }
  return i;
}

/**
 * Blanks out a regular quoted string literal starting at index i.
 * @param {string[]} chars - Mutable character array of the source.
 * @param {number} i - Index of the opening quote.
 * @param {number} n - Length of chars array.
 * @returns {number} Index immediately after the blanked string.
 */
function skipString(chars, i, n) 
{
  const quote = chars[i];
  chars[i++] = ' ';
  while (i < n) 
  {
    if (chars[i] === '\\') 
    {
      chars[i] = ' ';
      if (i + 1 < n && chars[i + 1] !== '\n' && chars[i + 1] !== '\r') 
      {
        chars[i + 1] = ' ';
      }
      i += COMMENT_MARKER_LENGTH;
      continue;
    }
    if (chars[i] === quote) 
    {
      chars[i] = ' ';
      return i + 1;
    }
    if (chars[i] === '\n' || chars[i] === '\r') 
    {
      break;
    }
    chars[i++] = ' ';
  }
  return i;
}

/**
 * Replaces comments and string literals with spaces while preserving original code offsets and line breaks.
 * @param {string} code - Full GML script text.
 * @returns {string} Code with comments and string contents scrubbed out.
 */
function sanitizeCode(code) 
{
  const chars = code.split('');
  const n = chars.length;
  let i = 0;

  while (i < n) 
  {
    const curr = chars[i];
    const next = chars[i + 1];

    if (curr === '/') 
    {
      if (next === '/') 
      {
        i = skipLineComment(chars, i, n); 
        continue; 
      }
      if (next === '*') 
      {
        i = skipBlockComment(chars, i, n); 
        continue; 
      }
    }
    else if (curr === '@' && (next === '"' || next === '\'')) 
    {
      i = skipVerbatimString(chars, i, n);
      continue;
    }
    else if (curr === '"' || curr === '\'') 
    {
      i = skipString(chars, i, n);
      continue;
    }
    i++;
  }
  return chars.join('');
}

/**
 * Pops a single single-statement scope frame from the stack if present.
 * @param {ScopeFrame[]} stack - Scope stack array.
 * @returns {void}
 */
function popSingleScope(stack) 
{
  if (stack.length > MIN_STACK_DEPTH && stack[stack.length - 1].type === 'single') 
  {
    stack.pop();
  }
}

/**
 * Updates parenthesis tracking depth based on token value.
 * @param {string} val - Token string value.
 * @param {number} depth - Current parenthesis depth.
 * @returns {number} Updated parenthesis depth.
 */
function updateParenDepth(val, depth) 
{
  if (val === '(') 
  {
    return depth + 1;
  }
  if (val === ')' && depth > 0) 
  {
    return depth - 1;
  }
  return depth;
}

/**
 * Updates pending control state based on token progress across statement headers or bodies.
 * @param {PendingControlState | null} pendingControl - Active control state context.
 * @param {{ value: string, line: number, column: number }} token - Current matched token object.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {ScopeFrame[]} stack - Scope stack array.
 * @returns {{ pendingControl: PendingControlState | null, consumedAsBlock: boolean }} Updated control state and block match indicator.
 */
function processPendingControl(pendingControl, token, parenDepth, stack) 
{
  if (!pendingControl) 
  {
    return { pendingControl: null, consumedAsBlock: false };
  }

  if (pendingControl.state === 'WAIT_HEADER') 
  {
    if (token.value === '(') 
    {
      pendingControl.state = 'IN_HEADER';
      pendingControl.targetParenDepth = parenDepth - 1;
    }
    else 
    {
      pendingControl.state = 'WAIT_BODY';
    }
  }
  else if (pendingControl.state === 'IN_HEADER') 
  {
    if (token.value === ')' && parenDepth <= pendingControl.targetParenDepth) 
    {
      pendingControl.state = 'WAIT_BODY';
    }
  }
  else if (pendingControl.state === 'WAIT_BODY') 
  {
    if (token.value === '{') 
    {
      stack.push({ type: 'braced', isLoop: pendingControl.isLoop, line: token.line });
      return { pendingControl: null, consumedAsBlock: true };
    }
    stack.push({ type: 'single', isLoop: pendingControl.isLoop, line: token.line });
    return { pendingControl: null, consumedAsBlock: false };
  }

  return { pendingControl, consumedAsBlock: false };
}

/**
 * Pops the stack up through the nearest enclosing braced scope, removing any trailing single statement scope.
 * @param {ScopeFrame[]} stack - Scope stack array.
 * @returns {void}
 */
function closeBraceScope(stack) 
{
  while (stack.length > MIN_STACK_DEPTH) 
  {
    if (stack.pop().type === 'braced') 
    {
      break;
    }
  }
  popSingleScope(stack);
}

/**
 * Derives the initial pendingControl state upon encountering a control-flow keyword.
 * @param {string} tokenValue - The control-flow keyword text value.
 * @param {ScopeFrame} currentScope - The innermost scope currently on top of the stack.
 * @returns {PendingControlState} Initial state configuration for pending control evaluation.
 */
function controlKeywordState(tokenValue, currentScope) 
{
  const isLoop = LOOP_KEYWORDS.has(tokenValue) || currentScope.isLoop;
  const state = (tokenValue === 'do' || tokenValue === 'else') ? 'WAIT_BODY' : 'WAIT_HEADER';
  return { isLoop, state };
}

/**
 * Evaluates structural and keyword tokens against current scope state and pushes rule violations.
 * @param {{ value: string, line: number, column: number }} token - Current matched token object.
 * @param {ScopeFrame[]} stack - Scope stack array.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {LintIssue[]} issues - Collection array for reported linting issues.
 * @returns {PendingControlState | null} Next pendingControl state, or null if no new state entered.
 */
function evaluateToken(token, stack, parenDepth, issues) 
{
  const currentScope = stack[stack.length - 1];

  if (token.value === '{') 
  {
    stack.push({ type: 'braced', isLoop: currentScope.isLoop, line: token.line });
    return null;
  }
  if (token.value === '}') 
  {
    closeBraceScope(stack);
    return null;
  }
  if (token.value === ';') 
  {
    if (parenDepth === 0) 
    {
      popSingleScope(stack);
    }
    return null;
  }
  if (CONTROL_KEYWORDS.has(token.value)) 
  {
    return controlKeywordState(token.value, currentScope);
  }
  if (token.value === 'function') 
  {
    return { isLoop: false, state: 'WAIT_HEADER' };
  }
  if (token.value === 'break' && !currentScope.isLoop) 
  {
    issues.push({
      line: token.line,
      column: token.column,
      message: 'GM1000: The "break" keyword must be used inside an enclosing loop or switch statement.',
    });
  }
  return null;
}

/**
 * Determines whether unbraced single-statement scopes should be popped at the start of a line.
 * @param {ScopeFrame[]} stack - Scope stack array.
 * @param {PendingControlState | null} pendingControl - Active pending control state object.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {number} currentLineNumber - 1-based line number being processed.
 * @returns {boolean} `true` if a single-statement scope needs to be popped.
 */
function shouldPopAtLineStart(stack, pendingControl, parenDepth, currentLineNumber) 
{
  const topScope = stack[stack.length - 1];
  if (parenDepth !== 0 || topScope.type !== 'single' || topScope.line >= currentLineNumber) 
  {
    return false;
  }
  return !pendingControl || pendingControl.state !== 'WAIT_BODY';
}

/**
 * Tokenizes a single sanitized code line and updates state in place.
 * @param {string} lineText - Sanitized content of the current line.
 * @param {number} currentLineNumber - 1-based line number of lineText.
 * @param {{ stack: ScopeFrame[], pendingControl: PendingControlState | null, parenDepth: number }} state - Scanning state tracking object.
 * @param {LintIssue[]} issues - Collection array for reported linting issues.
 * @returns {void}
 */
function processLineTokens(lineText, currentLineNumber, state, issues) 
{
  let match;
  while ((match = TOKEN_REGEX.exec(lineText)) !== null) 
  {
    const token = { value: match[0], line: currentLineNumber, column: match.index + COLUMN_OFFSET };
    state.parenDepth = updateParenDepth(token.value, state.parenDepth);

    const pendingResult = processPendingControl(state.pendingControl, token, state.parenDepth, state.stack);
    state.pendingControl = pendingResult.pendingControl;
    if (pendingResult.consumedAsBlock) 
    {
      continue;
    }

    const nextPending = evaluateToken(token, state.stack, state.parenDepth, issues);
    if (nextPending) 
    {
      state.pendingControl = nextPending;
    }
  }
}

/**
 * Checks GML code for invalid usage of the `break` keyword outside enclosing loops or switches.
 * @param {string} content - Full GML script content string.
 * @param {string[]} lines - Array of script content split by newline boundaries.
 * @returns {LintIssue[]} Array of detected GM1000 diagnostic issues.
 */
export default function checkGM1000(content, lines) 
{
  /** @type {LintIssue[]} */
  const issues = [];
  const sanitized = sanitizeCode(content || lines.join('\n'));
  const sanitizedLines = sanitized.split(/\r?\n/);

  /** @type {{ stack: ScopeFrame[], pendingControl: PendingControlState | null, parenDepth: number }} */
  const state = {
    stack: [{ type: 'braced', isLoop: false, line: 0 }],
    pendingControl: null,
    parenDepth: 0,
  };

  for (let lineIndex = 0; lineIndex < sanitizedLines.length; lineIndex += 1) 
  {
    const currentLineNumber = lineIndex + LINE_OFFSET;
    if (shouldPopAtLineStart(state.stack, state.pendingControl, state.parenDepth, currentLineNumber)) 
    {
      popSingleScope(state.stack);
    }
    processLineTokens(sanitizedLines[lineIndex], currentLineNumber, state, issues);
  }

  return issues;
}