/** @type {{ defaultSeverity: string, defaultEnabled: boolean }} */
export const meta = {
  defaultSeverity: 'warning',
  defaultEnabled: true,
};

const LINE_OFFSET = 1;
const COLUMN_OFFSET = 1;

const LOOP_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch']);
const CONTROL_KEYWORDS = new Set(['for', 'while', 'repeat', 'with', 'do', 'switch', 'if', 'else']);

/**
 * Replaces comments and string literals with spaces while preserving line breaks
 * to maintain accurate line numbers and column offsets.
 *
 * @param {string} code - Full GML script text.
 * @returns {string} Code with comments and strings scrubbed.
 */
function sanitizeCode(code) {
  const chars = code.split('');
  const n = chars.length;
  let i = 0;

  while (i < n) {
    // Single-line comment //
    if (chars[i] === '/' && chars[i + 1] === '/') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < n && chars[i] !== '\n' && chars[i] !== '\r') {
        chars[i] = ' ';
        i++;
      }
      continue;
    }

    // Multi-line comment /* ... */
    if (chars[i] === '/' && chars[i + 1] === '*') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < n) {
        if (chars[i] === '*' && chars[i + 1] === '/') {
          chars[i] = ' ';
          chars[i + 1] = ' ';
          i += 2;
          break;
        }
        if (chars[i] !== '\n' && chars[i] !== '\r') {
          chars[i] = ' ';
        }
        i++;
      }
      continue;
    }

    // Verbatim string @"..." or @'...'
    if (chars[i] === '@' && (chars[i + 1] === '"' || chars[i + 1] === '\'')) {
      const quote = chars[i + 1];
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < n) {
        if (chars[i] === quote) {
          chars[i] = ' ';
          i++;
          break;
        }
        if (chars[i] !== '\n' && chars[i] !== '\r') {
          chars[i] = ' ';
        }
        i++;
      }
      continue;
    }

    // Standard string "..." or '...'
    if (chars[i] === '"' || chars[i] === '\'') {
      const quote = chars[i];
      chars[i] = ' ';
      i++;
      while (i < n) {
        if (chars[i] === '\\') {
          chars[i] = ' ';
          if (i + 1 < n && chars[i + 1] !== '\n' && chars[i + 1] !== '\r') {
            chars[i + 1] = ' ';
          }
          i += 2;
          continue;
        }
        if (chars[i] === quote) {
          chars[i] = ' ';
          i++;
          break;
        }
        if (chars[i] === '\n' || chars[i] === '\r') {
          break;
        }
        chars[i] = ' ';
        i++;
      }
      continue;
    }

    i++;
  }

  return chars.join('');
}

/**
 * Checks for 'break' statements used outside of an enclosing loop or switch construct.
 *
 * @param {string} content - Full GML script text.
 * @param {string[]} lines - GML script split by line breaks.
 * @returns {Array<{line: number, column: number, message: string}>} Array of detected GM1000 issues.
 */
export default function checkGM1000(content, lines) {
  const issues = [];
  const fullText = content || lines.join('\n');
  const sanitized = sanitizeCode(fullText);
  const sanitizedLines = sanitized.split(/\r?\n/);

  /** @type {Array<{ type: 'braced' | 'single', isLoop: boolean, line: number }>} */
  const stack = [{ type: 'braced', isLoop: false, line: 0 }];

  let pendingControl = null;
  let parenDepth = 0;

  function currentScope() {
    return stack[stack.length - 1];
  }

  function popSingleScopes() {
    while (stack.length > 1 && stack[stack.length - 1].type === 'single') {
      stack.pop();
    }
  }

  // Updated REGEX: Matches identifiers, numeric literals (0xHEX, decimal), and structural syntax delimiters
  const TOKEN_REGEX = /\b0x[0-9a-fA-F]+\b|\b\d+(\.\d+)?\b|\b[a-zA-Z_]\w*\b|[\{\}\(\);]/g;

  for (let lineIndex = 0; lineIndex < sanitizedLines.length; lineIndex += 1) {
    const currentLineNumber = lineIndex + LINE_OFFSET;
    const lineText = sanitizedLines[lineIndex];
    let match;

    // Line boundary check: Close single-line scopes from previous lines if paren balance is flat
    if (parenDepth === 0 && stack.length > 1 && stack[stack.length - 1].type === 'single') {
      if (stack[stack.length - 1].line < currentLineNumber) {
        // If pendingControl isn't awaiting a body on this line, auto-close statement scope
        if (!pendingControl || pendingControl.state !== 'WAIT_BODY') {
          popSingleScopes();
        }
      }
    }

    while ((match = TOKEN_REGEX.exec(lineText)) !== null) {
      const token = {
        value: match[0],
        line: currentLineNumber,
        column: match.index + COLUMN_OFFSET,
      };

      if (token.value === '(') {
        parenDepth += 1;
      } else if (token.value === ')') {
        if (parenDepth > 0) {
          parenDepth -= 1;
        }
      }

      // 1. Handle pending control headers & bodies
      if (pendingControl) {
        if (pendingControl.state === 'WAIT_HEADER') {
          if (token.value === '(') {
            pendingControl.state = 'IN_HEADER';
            pendingControl.targetParenDepth = parenDepth - 1;
          } else {
            // Unparenthesized headers (e.g. repeat 10, with obj)
            pendingControl.state = 'WAIT_BODY';
          }
        } else if (pendingControl.state === 'IN_HEADER') {
          if (token.value === ')' && parenDepth <= pendingControl.targetParenDepth) {
            pendingControl.state = 'WAIT_BODY';
          }
        } else if (pendingControl.state === 'WAIT_BODY') {
          if (token.value === '{') {
            stack.push({ type: 'braced', isLoop: pendingControl.isLoop, line: token.line });
            pendingControl = null;
            continue; // '{' consumed as block start
          } else {
            stack.push({ type: 'single', isLoop: pendingControl.isLoop, line: token.line });
            pendingControl = null;
          }
        }
      }

      // 2. Process token in current scope
      if (token.value === '{') {
        stack.push({ type: 'braced', isLoop: currentScope().isLoop, line: token.line });
      } else if (token.value === '}') {
        while (stack.length > 1) {
          const popped = stack.pop();
          if (popped.type === 'braced') {
            break;
          }
        }
        popSingleScopes();
      } else if (token.value === ';') {
        if (parenDepth === 0) {
          popSingleScopes();
        }
      } else if (CONTROL_KEYWORDS.has(token.value)) {
        const isLoop = LOOP_KEYWORDS.has(token.value) || currentScope().isLoop;
        const state = (token.value === 'do' || token.value === 'else') ? 'WAIT_BODY' : 'WAIT_HEADER';
        pendingControl = { isLoop, state };
      } else if (token.value === 'function') {
        pendingControl = { isLoop: false, state: 'WAIT_HEADER' };
      } else if (token.value === 'break') {
        if (!currentScope().isLoop) {
          issues.push({
            line: token.line,
            column: token.column,
            message: 'GM1000: The "break" keyword must be used inside an enclosing loop or switch statement.',
          });
        }
      }
    }
  }

  return issues;
}