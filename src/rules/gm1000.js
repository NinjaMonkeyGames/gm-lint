/** @type {{ defaultSeverity: string, defaultEnabled: boolean }} */
export const meta = {
  defaultSeverity: 'warning',
  defaultEnabled: true,
};

const LINE_OFFSET = 1;
const COLUMN_OFFSET = 1;
const COMMENT_MARKER_LENGTH = 2;
const MIN_STACK_DEPTH = 1;

const LOOP_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch']);
const CONTROL_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch', 'if', 'else']);
const TOKEN_REGEX = /\b0x[0-9a-fA-F]+\b|\b\d+(\.\d+)?\b|\b[a-zA-Z_]\w*\b|[{}();]/g;

/**
 * Blanks out a `//` line comment starting at index i, stopping before any line break.
 * @param {string[]} chars - Mutable character array of the source.
 * @param {number} i - Index of the first '/' of the comment marker.
 * @param {number} n - Length of chars.
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
 * @param {number} n - Length of chars.
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
 * @param {number} n - Length of chars.
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
 * @param {number} n - Length of chars.
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
 * Replaces comments and string literals with spaces while preserving line breaks.
 * @param {string} code - Full GML script text.
 * @returns {string} Code with comments and strings scrubbed.
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
        i = skipLineComment(chars, i, n); continue; 
      }
      if (next === '*') 
      {
        i = skipBlockComment(chars, i, n); continue; 
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
 * Pops single-statement scopes from the stack.
 * @param {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} stack - Scope stack.
 * @returns {void}
 */
function popSingleScopes(stack) 
{
  while (stack.length > MIN_STACK_DEPTH && stack[stack.length - 1].type === 'single') 
  {
    stack.pop();
  }
}

/**
 * Updates parenthesis tracking depth.
 * @param {string} val - Token text value.
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
 * Updates pending control state based on current header or body progress.
 * @param {{ isLoop: boolean, state: string, targetParenDepth?: number } | null} pendingControl - Active control state object.
 * @param {{ value: string, line: number, column: number }} token - Current token.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} stack - Scope stack.
 * @returns {{ pendingControl: { isLoop: boolean, state: string, targetParenDepth?: number } | null, consumedAsBlock: boolean }} Updated state and block match status.
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
 * Pops the stack up through the nearest enclosing braced scope.
 * @param {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} stack - Scope stack.
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
  popSingleScopes(stack);
}

/**
 * Derives the pendingControl state to enter after seeing a control-flow keyword.
 * @param {string} tokenValue - The keyword's text value.
 * @param {{ isLoop: boolean }} currentScope - Innermost scope on the stack.
 * @returns {{ isLoop: boolean, state: string }} Initial pendingControl state.
 */
function controlKeywordState(tokenValue, currentScope) 
{
  const isLoop = LOOP_KEYWORDS.has(tokenValue) || currentScope.isLoop;
  const state = (tokenValue === 'do' || tokenValue === 'else') ? 'WAIT_BODY' : 'WAIT_HEADER';
  return { isLoop, state };
}

/**
 * Evaluates structural and keyword tokens against scope and issues state.
 * @param {{ value: string, line: number, column: number }} token - Current token.
 * @param {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} stack - Scope stack.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {Array<{ line: number, column: number, message: string }>} issues - Issues collection array.
 * @returns {{ isLoop: boolean, state: string } | null} Next pendingControl state or null.
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
      popSingleScopes(stack);
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
 * Determines whether leftover single-statement scopes should be popped at line start.
 * @param {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} stack - Scope stack.
 * @param {{ state: string } | null} pendingControl - Active control state object.
 * @param {number} parenDepth - Current parenthesis depth.
 * @param {number} currentLineNumber - 1-based line number about to be processed.
 * @returns {boolean} True if single-statement scopes should be popped now.
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
 * Tokenizes a single sanitized line and updates the scan state in place.
 * @param {string} lineText - Sanitized text of the current line.
 * @param {number} currentLineNumber - 1-based line number of lineText.
 * @param {{ stack: Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>, pendingControl: { isLoop: boolean, state: string, targetParenDepth?: number } | null, parenDepth: number }} state - Scan state.
 * @param {Array<{ line: number, column: number, message: string }>} issues - Issues array.
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
 * Checks for 'break' statements used outside of an enclosing loop or switch construct.
 * @param {string} content - Full GML script text.
 * @param {string[]} lines - GML script split by line breaks.
 * @returns {Array<{line: number, column: number, message: string}>} Array of detected GM1000 issues.
 */
export default function checkGM1000(content, lines) 
{
  const issues = [];
  const sanitized = sanitizeCode(content || lines.join('\n'));
  const sanitizedLines = sanitized.split(/\r?\n/);

  /** @type {{ stack: Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>, pendingControl: { isLoop: boolean, state: string, targetParenDepth?: number } | null, parenDepth: number }} */
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
      popSingleScopes(state.stack);
    }
    processLineTokens(sanitizedLines[lineIndex], currentLineNumber, state, issues);
  }

  return issues;
}