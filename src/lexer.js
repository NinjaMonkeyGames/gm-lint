'use strict';

/**
 * @file Hand-written tokenizer for GameMaker Language (GML).
 * @remarks GML Lexer core.
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

const OFFSET_NEXT = 1;
const OFFSET_TWO = 2;
const MAX_OPERATOR_SLICE = 4;

/**
 * Custom error class for syntax errors encountered during tokenization.
 * @public
 */
class GmlSyntaxError extends Error 
{
  /**
   * Creates an instance of GmlSyntaxError.
   * @public
   * @param {string} message - Error message.
   * @param {number} line - Line number where the error occurred.
   * @param {number} column - Column number where the error occurred.
   */
  constructor(message, line, column) 
  {
    super(message);
    this.name = 'GmlSyntaxError';
    this.line = line;
    this.column = column;
  }
}

/**
 * Checks if a character is a decimal digit.
 * @private
 * @param {string} ch - Character to check.
 * @returns {boolean} True if digit.
 */
function isDigit(ch) 
{
  return ch >= '0' && ch <= '9';
}

/**
 * Checks if a character can start an identifier.
 * @private
 * @param {string} ch - Character to check.
 * @returns {boolean} True if valid identifier start.
 */
function isIdentStart(ch) 
{
  return /[A-Za-z_]/.test(ch);
}

/**
 * Checks if a character can be part of an identifier.
 * @private
 * @param {string} ch - Character to check.
 * @returns {boolean} True if valid identifier part.
 */
function isIdentPart(ch) 
{
  return /[A-Za-z0-9_]/.test(ch);
}

/**
 * Tokenize GML source into a flat array of tokens.
 * Never throws on malformed input for things like unterminated strings;
 * instead it records an `errors` array so the linter can still report
 * everything it found (mirrors how the GameMaker editor keeps working
 * while flagging syntax problems).
 * @public
 * @param {string} source - The raw GML source text.
 * @returns {{ tokens: object[], errors: GmlSyntaxError[] }} Tokenized array and any collected syntax errors.
 */
/* eslint-disable complexity */
/**
 *
 * @param source
 */
function tokenize(source) 
{
  const tokens = [];
  const errors = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const len = source.length;

  /**
   * Advances the character pointer.
   * @private
   * @param {number} [n] - Number of characters to advance.
   * @returns {void}
   */
  function advance(n = 1) 
  {
    for (let k = 0; k < n; k++) 
    {
      if (source[i] === '\n') 
      {
        line++;
        col = 1;
      }
      else 
      {
        col++;
      }
      i++;
    }
  }

  /**
   * Pushes a new token into the collection.
   * @private
   * @param {string} type - Token type.
   * @param {string|null} value - Token value.
   * @param {number} startLine - Line position.
   * @param {number} startCol - Column position.
   * @returns {void}
   */
  function push(type, value, startLine, startCol) 
  {
    tokens.push({ type, value, line: startLine, column: startCol });
  }

  while (i < len) 
  {
    const ch = source[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') 
    {
      advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // Line comment
    if (ch === '/' && source[i + OFFSET_NEXT] === '/') 
    {
      let text = '';
      while (i < len && source[i] !== '\n') 
      {
        text += source[i];
        advance();
      }
      push('Comment', text, startLine, startCol);
      continue;
    }

    // Block comment
    if (ch === '/' && source[i + OFFSET_NEXT] === '*') 
    {
      let text = '/*';
      advance(OFFSET_TWO);
      while (i < len && !(source[i] === '*' && source[i + OFFSET_NEXT] === '/')) 
      {
        text += source[i];
        advance();
      }
      if (i < len) 
      {
        text += '*/';
        advance(OFFSET_TWO);
      }
      else 
      {
        errors.push(new GmlSyntaxError('Unterminated block comment', startLine, startCol));
      }
      push('Comment', text, startLine, startCol);
      continue;
    }

    // Region / macro / define directives -- treat the whole line as one token
    if (ch === '#') 
    {
      let text = '';
      while (i < len && source[i] !== '\n') 
      {
        text += source[i];
        advance();
      }
      push('Directive', text, startLine, startCol);
      continue;
    }

    // Verbatim string: @"..." or @'...'
    if (ch === '@' && (source[i + OFFSET_NEXT] === '"' || source[i + OFFSET_NEXT] === '\'')) 
    {
      const quote = source[i + OFFSET_NEXT];
      advance(OFFSET_TWO);
      let value = '';
      while (i < len && source[i] !== quote) 
      {
        value += source[i];
        advance();
      }
      if (i >= len) 
      {
        errors.push(new GmlSyntaxError('Unterminated verbatim string', startLine, startCol));
      }
      else 
      {
        advance();
      }
      push('String', value, startLine, startCol);
      continue;
    }

    // Regular string literal (single or double quoted, GML supports both)
    if (ch === '"' || ch === '\'') 
    {
      const quote = ch;
      advance();
      let value = '';
      while (i < len && source[i] !== quote) 
      {
        if (source[i] === '\\' && i + OFFSET_NEXT < len) 
        {
          value += source[i] + source[i + OFFSET_NEXT];
          advance(OFFSET_TWO);
        }
        else if (source[i] === '\n') 
        {
          break; // unterminated - bail so we don't eat the whole file
        }
        else 
        {
          value += source[i];
          advance();
        }
      }
      if (source[i] !== quote) 
      {
        errors.push(new GmlSyntaxError('Unterminated string literal', startLine, startCol));
      }
      else 
      {
        advance();
      }
      push('String', value, startLine, startCol);
      continue;
    }

    // Numbers: 0x hex, 0b binary, decimal, decimal.decimal
    if (isDigit(ch) || (ch === '.' && isDigit(source[i + OFFSET_NEXT]))) 
    {
      let text = '';
      if (ch === '0' && (source[i + OFFSET_NEXT] === 'x' || source[i + OFFSET_NEXT] === 'X')) 
      {
        text += source[i] + source[i + OFFSET_NEXT];
        advance(OFFSET_TWO);
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) 
        {
          text += source[i];
          advance();
        }
      }
      else if (ch === '0' && (source[i + OFFSET_NEXT] === 'b' || source[i + OFFSET_NEXT] === 'B')) 
      {
        text += source[i] + source[i + OFFSET_NEXT];
        advance(OFFSET_TWO);
        while (i < len && /[01_]/.test(source[i])) 
        {
          text += source[i];
          advance();
        }
      }
      else 
      {
        while (i < len && (isDigit(source[i]) || source[i] === '_')) 
        {
          text += source[i];
          advance();
        }
        if (source[i] === '.' && isDigit(source[i + OFFSET_NEXT])) 
        {
          text += source[i];
          advance();
          while (i < len && (isDigit(source[i]) || source[i] === '_')) 
          {
            text += source[i];
            advance();
          }
        }
      }
      push('Number', text.replace(/_/g, ''), startLine, startCol);
      continue;
    }

    // Identifiers / keywords
    if (isIdentStart(ch)) 
    {
      let text = '';
      while (i < len && isIdentPart(source[i])) 
      {
        text += source[i];
        advance();
      }
      push(KEYWORDS.has(text) ? 'Keyword' : 'Identifier', text, startLine, startCol);
      continue;
    }

    // Operators / punctuation (longest match wins)
    const rest = source.slice(i, i + MAX_OPERATOR_SLICE);
    const op = OPERATORS.find((candidate) => rest.startsWith(candidate));
    if (op) 
    {
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
/* eslint-enable complexity */

module.exports = { tokenize, GmlSyntaxError };