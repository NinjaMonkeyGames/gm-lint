'use strict';

/**
 * A hand-written tokenizer for GameMaker Language (GML).
 *
 * GML is close enough to JS/C that a classic single-pass lexer works well.
 * We keep line/column info on every token so rules can produce useful
 * Feather-style diagnostics with accurate locations.
 */

const KEYWORDS = new Set([
  'var', 'static', 'globalvar', 'function', 'return', 'if', 'else', 'for',
  'while', 'do', 'until', 'repeat', 'switch', 'case', 'default', 'break',
  'continue', 'exit', 'with', 'try', 'catch', 'finally', 'throw', 'new',
  'delete', 'enum', 'and', 'or', 'not', 'xor', 'mod', 'div', 'true', 'false',
  'undefined', 'self', 'other', 'noone', 'all', 'global', 'constructor',
  'begin', 'end', 'then', 'in',
]);

// Multi-character operators must be listed longest-first so we greedily
// match the longest valid token (e.g. `??=` before `??` before `?`).
const OPERATORS = [
  '...', '??=', '<<=', '>>=',
  '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=',
  '%=', '&=', '|=', '^=', '<<', '>>', '??', '?.', '=>',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
  '.', ',', ';', '(', ')', '{', '}', '[', ']', '$',
].sort((a, b) => b.length - a.length);

class GmlSyntaxError extends Error {
  constructor(message, line, column) {
    super(message);
    this.name = 'GmlSyntaxError';
    this.line = line;
    this.column = column;
  }
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * Tokenize GML source into a flat array of tokens.
 * Never throws on malformed input for things like unterminated strings;
 * instead it records an `errors` array so the linter can still report
 * everything it found (mirrors how the GameMaker editor keeps working
 * while flagging syntax problems).
 */
function tokenize(source) {
  const tokens = [];
  const errors = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const len = source.length;

  function advance(n = 1) {
    for (let k = 0; k < n; k++) {
      if (source[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  }

  function push(type, value, startLine, startCol) {
    tokens.push({ type, value, line: startLine, column: startCol });
  }

  while (i < len) {
    const ch = source[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // Line comment
    if (ch === '/' && source[i + 1] === '/') {
      let text = '';
      while (i < len && source[i] !== '\n') {
        text += source[i];
        advance();
      }
      push('Comment', text, startLine, startCol);
      continue;
    }

    // Block comment
    if (ch === '/' && source[i + 1] === '*') {
      let text = '/*';
      advance(2);
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) {
        text += source[i];
        advance();
      }
      if (i < len) {
        text += '*/';
        advance(2);
      } else {
        errors.push(new GmlSyntaxError('Unterminated block comment', startLine, startCol));
      }
      push('Comment', text, startLine, startCol);
      continue;
    }

    // Region / macro / define directives -- treat the whole line as one token
    if (ch === '#') {
      let text = '';
      while (i < len && source[i] !== '\n') {
        text += source[i];
        advance();
      }
      push('Directive', text, startLine, startCol);
      continue;
    }

    // Verbatim string: @"..." or @'...'
    if (ch === '@' && (source[i + 1] === '"' || source[i + 1] === "'")) {
      const quote = source[i + 1];
      advance(2);
      let value = '';
      while (i < len && source[i] !== quote) {
        value += source[i];
        advance();
      }
      if (i >= len) {
        errors.push(new GmlSyntaxError('Unterminated verbatim string', startLine, startCol));
      } else {
        advance();
      }
      push('String', value, startLine, startCol);
      continue;
    }

    // Regular string literal (single or double quoted, GML supports both)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      advance();
      let value = '';
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          value += source[i] + source[i + 1];
          advance(2);
        } else if (source[i] === '\n') {
          break; // unterminated - bail so we don't eat the whole file
        } else {
          value += source[i];
          advance();
        }
      }
      if (source[i] !== quote) {
        errors.push(new GmlSyntaxError('Unterminated string literal', startLine, startCol));
      } else {
        advance();
      }
      push('String', value, startLine, startCol);
      continue;
    }

    // Numbers: 0x hex, 0b binary, decimal, decimal.decimal
    if (isDigit(ch) || (ch === '.' && isDigit(source[i + 1]))) {
      let text = '';
      if (ch === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        text += source[i] + source[i + 1];
        advance(2);
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) {
          text += source[i];
          advance();
        }
      } else if (ch === '0' && (source[i + 1] === 'b' || source[i + 1] === 'B')) {
        text += source[i] + source[i + 1];
        advance(2);
        while (i < len && /[01_]/.test(source[i])) {
          text += source[i];
          advance();
        }
      } else {
        while (i < len && (isDigit(source[i]) || source[i] === '_')) {
          text += source[i];
          advance();
        }
        if (source[i] === '.' && isDigit(source[i + 1])) {
          text += source[i];
          advance();
          while (i < len && (isDigit(source[i]) || source[i] === '_')) {
            text += source[i];
            advance();
          }
        }
      }
      push('Number', text.replace(/_/g, ''), startLine, startCol);
      continue;
    }

    // Identifiers / keywords
    if (isIdentStart(ch)) {
      let text = '';
      while (i < len && isIdentPart(source[i])) {
        text += source[i];
        advance();
      }
      push(KEYWORDS.has(text) ? 'Keyword' : 'Identifier', text, startLine, startCol);
      continue;
    }

    // Operators / punctuation (longest match wins)
    const rest = source.slice(i, i + 4);
    const op = OPERATORS.find((candidate) => rest.startsWith(candidate));
    if (op) {
      push('Punctuator', op, startLine, startCol);
      advance(op.length);
      continue;
    }

    // Unknown character - record and skip so we can keep going
    errors.push(new GmlSyntaxError(`Unexpected character '${ch}'`, startLine, startCol));
    advance();
  }

  tokens.push({ type: 'EOF', value: null, line, column: col });
  return { tokens, errors };
}

module.exports = { tokenize, GmlSyntaxError };
