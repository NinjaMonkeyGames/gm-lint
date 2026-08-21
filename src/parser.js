'use strict';

import { tokenize, GmlSyntaxError } from './lexer.js';

// Binary operator precedence, low -> high. Keyword aliases (and/or/etc)
// are normalized to their symbolic equivalents during parsing.
const PRECEDENCE = {
  '??': 1,
  '||': 2,
  '&&': 3,
  '|': 4,
  '^': 5,
  '&': 6,
  '==': 7, '!=': 7,
  '<': 8, '<=': 8, '>': 8, '>=': 8,
  '<<': 9, '>>': 9,
  '+': 10, '-': 10,
  '*': 11, '/': 11, '%': 11,
};

const KEYWORD_OPERATOR_ALIASES = {
  and: '&&',
  or: '||',
  xor: '^^',
  mod: '%',
  div: 'div',
  not: '!',
};

const ASSIGNMENT_OPERATORS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '??=', '&=', '|=', '^=', '<<=', '>>=',
]);

/**
 * GML Parser core.
 */
class Parser 
{
  /**
   * Creates an instance of Parser.
   * @public
   * @param {string} source - The raw GML source text.
   * @param {object} [options] - Parser options.
   * @param {string} [options.filename] - Source filename.
   */
  constructor(source, { filename = '<input>' } = {}) 
  {
    this.source = source;
    this.filename = filename;
    const { tokens, errors } = tokenize(source);
    // Comments/directives are not part of the grammar we parse; keep them
    // aside in case a rule wants to inspect them (e.g. banned directives).
    this.comments = tokens.filter((t) => t.type === 'Comment');
    this.directives = tokens.filter((t) => t.type === 'Directive');
    this.tokens = tokens.filter((t) => t.type !== 'Comment' && t.type !== 'Directive');
    this.errors = errors;
    this.pos = 0;
  }

  // ---- token helpers -----------------------------------------------

  /**
   * Looks ahead at a token by an offset.
   * @public
   * @param {number} [offset] - Token lookahead offset.
   * @returns {object} The looked-ahead token.
   */
  peek(offset = 0) 
  {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  /**
   * Checks if the current token matches type and optional value.
   * @public
   * @param {string} type - Expected token type.
   * @param {string|string[]} [value] - Expected token value or array of values.
   * @returns {boolean} True if matched.
   */
  at(type, value) 
  {
    const t = this.peek();
    if (t.type !== type) 
    {
      return false;
    }
    if (value !== undefined) 
    {
      return Array.isArray(value) ? value.includes(t.value) : t.value === value;
    }
    return true;
  }

  /**
   * Checks if current token is a punctuator with a specific value.
   * @public
   * @param {string} value - Punctuator value.
   * @returns {boolean} True if matched.
   */
  atPunct(value) 
  {
    return this.at('Punctuator', value);
  }

  /**
   * Checks if current token is a keyword with a specific value.
   * @public
   * @param {string|string[]} value - Keyword value or values.
   * @returns {boolean} True if matched.
   */
  atKeyword(value) 
  {
    return this.at('Keyword', value);
  }

  /**
   * Consumes and returns the current token, advancing the pointer.
   * @public
   * @returns {object} The consumed token.
   */
  next() 
  {
    const t = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) 
    {
      this.pos++;
    }
    return t;
  }

  /**
   * Expects a specific token type and value, recording an error if missing.
   * @public
   * @param {string} type - Expected token type.
   * @param {string} [value] - Expected token value.
   * @param {string} [context] - Error context description.
   * @returns {object} The consumed or current token.
   */
  expect(type, value, context) 
  {
    const t = this.peek();
    const matches = t.type === type && (value === undefined || t.value === value);
    if (!matches) 
    {
      this.error(
        `Expected ${value ? `'${value}'` : type}${context ? ` in ${context}` : ''} but found ${
          t.type === 'EOF' ? 'end of file' : `'${t.value}'`
        }`,
        t,
      );
      // Error recovery: don't consume, let caller decide how to continue.
      return t;
    }
    return this.next();
  }

  /**
   * Records a syntax error.
   * @public
   * @param {string} message - Error message.
   * @param {object} [token] - Associated token.
   * @returns {void}
   */
  error(message, token = this.peek()) 
  {
    this.errors.push(new GmlSyntaxError(message, token.line, token.column));
  }

  // Skip tokens until we reach a statement boundary, so one syntax error
  // doesn't prevent the rest of the file from being linted.
  /**
   * Synchronizes parser state after a syntax error.
   * @public
   * @returns {void}
   */
  synchronize() 
  {
    while (!this.at('EOF')) 
    {
      if (this.atPunct(';')) 
      {
        this.next();
        return;
      }
      if (this.atPunct('}') || this.atKeyword([
        'if', 'for', 'while', 'do', 'switch', 'return', 'var', 'function',
      ])) 
      {
        return;
      }
      this.next();
    }
  }

  /**
   * Creates location metadata for an AST node.
   * @public
   * @param {object} startToken - The starting token.
   * @returns {{ line: number, column: number }} Location object.
   */
  loc(startToken) 
  {
    return { line: startToken.line, column: startToken.column };
  }

  // ---- entry point ----------------------------------------------------

  /**
   * Parses the entire GML program.
   * @public
   * @returns {object} The Program AST node.
   */
  parseProgram() 
  {
    const start = this.peek();
    const body = [];
    while (!this.at('EOF')) 
    {
      const before = this.pos;
      try 
      {
        body.push(this.parseStatement());
      }
      catch (err) 
      {
        if (err instanceof GmlSyntaxError) 
        {
          this.errors.push(err);
          this.synchronize();
        }
        else 
        {
          throw err;
        }
      }
      if (this.pos === before) 
      {
        this.next();
      } // safety net against infinite loops
    }
    return {
      type: 'Program',
      body,
      loc: this.loc(start),
      comments: this.comments,
      errors: this.errors,
    };
  }

  // ---- statements -------------------------------------------------

  /**
   * Parses a single statement.
   * @public
   * @returns {object} Statement AST node.
   */
  parseStatement() 
  {
    const t = this.peek();

    if (this.atPunct(';')) 
    {
      this.next();
      return { type: 'EmptyStatement', loc: this.loc(t) };
    }
    if (this.atPunct('{')) 
    {
      return this.parseBlock();
    }

    if (this.atKeyword(['var', 'static', 'globalvar'])) 
    {
      return this.parseVarDeclaration();
    }
    if (this.atKeyword('function')) 
    {
      return this.parseFunctionDeclaration();
    }
    if (this.atKeyword('if')) 
    {
      return this.parseIf();
    }
    if (this.atKeyword('for')) 
    {
      return this.parseFor();
    }
    if (this.atKeyword('while')) 
    {
      return this.parseWhile();
    }
    if (this.atKeyword('repeat')) 
    {
      return this.parseRepeat();
    }
    if (this.atKeyword('do')) 
    {
      return this.parseDoUntil();
    }
    if (this.atKeyword('switch')) 
    {
      return this.parseSwitch();
    }
    if (this.atKeyword('with')) 
    {
      return this.parseWith();
    }
    if (this.atKeyword('try')) 
    {
      return this.parseTry();
    }
    if (this.atKeyword('return')) 
    {
      return this.parseReturn();
    }
    if (this.atKeyword('break')) 
    {
      this.next(); this.consumeSemi(); return { type: 'BreakStatement', loc: this.loc(t) }; 
    }
    if (this.atKeyword('continue')) 
    {
      this.next(); this.consumeSemi(); return { type: 'ContinueStatement', loc: this.loc(t) }; 
    }
    if (this.atKeyword('exit')) 
    {
      this.next(); this.consumeSemi(); return { type: 'ExitStatement', loc: this.loc(t) }; 
    }
    if (this.atKeyword('throw')) 
    {
      return this.parseThrow();
    }
    if (this.atKeyword('enum')) 
    {
      return this.parseEnum();
    }
    if (this.atKeyword('delete')) 
    {
      return this.parseDeleteStatement();
    }

    return this.parseExpressionStatement();
  }

  /**
   * Consumes an optional semicolon.
   * @public
   * @returns {void}
   */
  consumeSemi() 
  {
    if (this.atPunct(';')) 
    {
      this.next();
    }
  }

  /**
   * Parses a block statement.
   * @public
   * @returns {object} BlockStatement AST node.
   */
  parseBlock() 
  {
    const start = this.expect('Punctuator', '{', 'block');
    const body = [];
    while (!this.atPunct('}') && !this.at('EOF')) 
    {
      const before = this.pos;
      body.push(this.parseStatement());
      if (this.pos === before) 
      {
        this.next();
      }
    }
    this.expect('Punctuator', '}', 'block');
    return { type: 'BlockStatement', body, loc: this.loc(start) };
  }

  /**
   * Parses a block or a single statement.
   * @public
   * @returns {object} Statement AST node.
   */
  parseBlockOrStatement() 
  {
    if (this.atPunct('{')) 
    {
      return this.parseBlock();
    }
    return this.parseStatement();
  }

  /**
   * Parses variable declarations.
   * @public
   * @returns {object} VariableDeclaration AST node.
   */
  parseVarDeclaration() 
  {
    const start = this.next(); // var | static | globalvar
    const kind = start.value;
    const declarations = [];
    do 
    {
      const idTok = this.expect('Identifier', undefined, `${kind} declaration`);
      let init = null;
      if (this.atPunct('=')) 
      {
        this.next();
        init = this.parseExpression();
      }
      declarations.push({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: idTok.value, loc: this.loc(idTok) },
        init,
        loc: this.loc(idTok),
      });
    } while (this.atPunct(',') && this.next());
    this.consumeSemi();
    return { type: 'VariableDeclaration', kind, declarations, loc: this.loc(start) };
  }

  /**
   * Parses a function declaration.
   * @public
   * @returns {object} FunctionDeclaration AST node.
   */
  parseFunctionDeclaration() 
  {
    const start = this.next(); // 'function'
    let id = null;
    if (this.at('Identifier')) 
    {
      const idTok = this.next();
      id = { type: 'Identifier', name: idTok.value, loc: this.loc(idTok) };
    }
    const params = this.parseParams();
    let superClass = null;
    if (this.atPunct(':')) 
    {
      // constructor inheritance: function Foo() : Bar() constructor {}
      this.next();
      superClass = this.parseCallExpression(this.parsePrimary());
    }
    let isConstructor = false;
    if (this.atKeyword('constructor')) 
    {
      this.next();
      isConstructor = true;
    }
    const body = this.parseBlock();
    return {
      type: 'FunctionDeclaration',
      id,
      params,
      body,
      isConstructor,
      superClass,
      loc: this.loc(start),
    };
  }

  /**
   * Parses function parameters.
   * @public
   * @returns {object[]} Array of parameter objects.
   */
  parseParams() 
  {
    this.expect('Punctuator', '(', 'function parameters');
    const params = [];
    while (!this.atPunct(')') && !this.at('EOF')) 
    {
      const idTok = this.expect('Identifier', undefined, 'function parameter');
      let defaultValue = null;
      if (this.atPunct('=')) 
      {
        this.next();
        defaultValue = this.parseExpression();
      }
      params.push({
        type: 'Param',
        name: idTok.value,
        default: defaultValue,
        loc: this.loc(idTok),
      });
      if (this.atPunct(',')) 
      {
        this.next();
      }
      else 
      {
        break;
      }
    }
    this.expect('Punctuator', ')', 'function parameters');
    return params;
  }

  /**
   * Parses an if statement.
   * @public
   * @returns {object} IfStatement AST node.
   */
  parseIf() 
  {
    const start = this.next(); // 'if'
    this.expect('Punctuator', '(', 'if condition');
    const test = this.parseExpression();
    this.expect('Punctuator', ')', 'if condition');
    if (this.atKeyword('then')) 
    {
      this.next();
    } // legacy GML allows `then`
    const consequent = this.parseBlockOrStatement();
    let alternate = null;
    if (this.atKeyword('else')) 
    {
      this.next();
      alternate = this.parseBlockOrStatement();
    }
    return { type: 'IfStatement', test, consequent, alternate, loc: this.loc(start) };
  }

  /**
   * Parses a for loop statement.
   * @public
   * @returns {object} ForStatement AST node.
   */
  parseFor() 
  {
    const start = this.next();
    this.expect('Punctuator', '(', 'for loop');
    let init = null;
    if (!this.atPunct(';')) 
    {
      init = this.atKeyword(['var', 'static', 'globalvar']) ? this.parseVarDeclaration() : this.parseExpressionStatement();
    }
    else 
    {
      this.next();
    }
    let test = null;
    if (!this.atPunct(';')) 
    {
      test = this.parseExpression();
    }
    this.expect('Punctuator', ';', 'for loop');
    let update = null;
    if (!this.atPunct(')')) 
    {
      update = this.parseExpression();
    }
    this.expect('Punctuator', ')', 'for loop');
    const body = this.parseBlockOrStatement();
    return { type: 'ForStatement', init, test, update, body, loc: this.loc(start) };
  }

  /**
   * Parses a while loop statement.
   * @public
   * @returns {object} WhileStatement AST node.
   */
  parseWhile() 
  {
    const start = this.next();
    this.expect('Punctuator', '(', 'while condition');
    const test = this.parseExpression();
    this.expect('Punctuator', ')', 'while condition');
    const body = this.parseBlockOrStatement();
    return { type: 'WhileStatement', test, body, loc: this.loc(start) };
  }

  /**
   * Parses a repeat loop statement.
   * @public
   * @returns {object} RepeatStatement AST node.
   */
  parseRepeat() 
  {
    const start = this.next();
    this.expect('Punctuator', '(', 'repeat count');
    const count = this.parseExpression();
    this.expect('Punctuator', ')', 'repeat count');
    const body = this.parseBlockOrStatement();
    return { type: 'RepeatStatement', count, body, loc: this.loc(start) };
  }

  /**
   * Parses a do-until loop statement.
   * @public
   * @returns {object} DoUntilStatement AST node.
   */
  parseDoUntil() 
  {
    const start = this.next(); // 'do'
    const body = this.parseBlockOrStatement();
    this.expect('Keyword', 'until', 'do-until loop');
    this.expect('Punctuator', '(', 'until condition');
    const test = this.parseExpression();
    this.expect('Punctuator', ')', 'until condition');
    this.consumeSemi();
    return { type: 'DoUntilStatement', body, test, loc: this.loc(start) };
  }

  /**
   * Parses a switch statement.
   * @public
   * @returns {object} SwitchStatement AST node.
   */
  parseSwitch() 
  {
    const start = this.next();
    this.expect('Punctuator', '(', 'switch');
    const discriminant = this.parseExpression();
    this.expect('Punctuator', ')', 'switch');
    this.expect('Punctuator', '{', 'switch body');
    const cases = [];
    while (!this.atPunct('}') && !this.at('EOF')) 
    {
      const caseStart = this.peek();
      let test = null;
      if (this.atKeyword('case')) 
      {
        this.next();
        test = this.parseExpression();
        this.expect('Punctuator', ':', 'case clause');
      }
      else 
      {
        this.expect('Keyword', 'default', 'switch case');
        this.expect('Punctuator', ':', 'default clause');
      }
      const consequent = [];
      while (!this.atKeyword(['case', 'default']) && !this.atPunct('}') && !this.at('EOF')) 
      {
        consequent.push(this.parseStatement());
      }
      cases.push({ type: 'SwitchCase', test, consequent, loc: this.loc(caseStart) });
    }
    this.expect('Punctuator', '}', 'switch body');
    return { type: 'SwitchStatement', discriminant, cases, loc: this.loc(start) };
  }

  /**
   * Parses a with statement.
   * @public
   * @returns {object} WithStatement AST node.
   */
  parseWith() 
  {
    const start = this.next();
    this.expect('Punctuator', '(', 'with');
    const object = this.parseExpression();
    this.expect('Punctuator', ')', 'with');
    const body = this.parseBlockOrStatement();
    return { type: 'WithStatement', object, body, loc: this.loc(start) };
  }

  /**
   * Parses a try-catch-finally statement.
   * @public
   * @returns {object} TryStatement AST node.
   */
  parseTry() 
  {
    const start = this.next();
    const block = this.parseBlock();
    let handler = null;
    if (this.atKeyword('catch')) 
    {
      const catchStart = this.next();
      let param = null;
      if (this.atPunct('(')) 
      {
        this.next();
        if (this.at('Identifier')) 
        {
          const idTok = this.next();
          param = { type: 'Identifier', name: idTok.value, loc: this.loc(idTok) };
        }
        this.expect('Punctuator', ')', 'catch');
      }
      const body = this.parseBlock();
      handler = { type: 'CatchClause', param, body, loc: this.loc(catchStart) };
    }
    let finalizer = null;
    if (this.atKeyword('finally')) 
    {
      this.next();
      finalizer = this.parseBlock();
    }
    return { type: 'TryStatement', block, handler, finalizer, loc: this.loc(start) };
  }

  /**
   * Parses a return statement.
   * @public
   * @returns {object} ReturnStatement AST node.
   */
  parseReturn() 
  {
    const start = this.next();
    let argument = null;
    if (!this.atPunct(';') && !this.atPunct('}') && !this.at('EOF')) 
    {
      argument = this.parseExpression();
    }
    this.consumeSemi();
    return { type: 'ReturnStatement', argument, loc: this.loc(start) };
  }

  /**
   * Parses a throw statement.
   * @public
   * @returns {object} ThrowStatement AST node.
   */
  parseThrow() 
  {
    const start = this.next();
    const argument = this.parseExpression();
    this.consumeSemi();
    return { type: 'ThrowStatement', argument, loc: this.loc(start) };
  }

  /**
   * Parses a delete statement.
   * @public
   * @returns {object} DeleteStatement AST node.
   */
  parseDeleteStatement() 
  {
    const start = this.next();
    const argument = this.parseUnary();
    this.consumeSemi();
    return { type: 'DeleteStatement', argument, loc: this.loc(start) };
  }

  /**
   * Parses an enum declaration.
   * @public
   * @returns {object} EnumDeclaration AST node.
   */
  parseEnum() 
  {
    const start = this.next();
    const idTok = this.expect('Identifier', undefined, 'enum declaration');
    this.expect('Punctuator', '{', 'enum body');
    const members = [];
    while (!this.atPunct('}') && !this.at('EOF')) 
    {
      const memberTok = this.expect('Identifier', undefined, 'enum member');
      let init = null;
      if (this.atPunct('=')) 
      {
        this.next();
        init = this.parseExpression();
      }
      members.push({ type: 'EnumMember', name: memberTok.value, init, loc: this.loc(memberTok) });
      if (this.atPunct(',')) 
      {
        this.next();
      }
      else 
      {
        break;
      }
    }
    this.expect('Punctuator', '}', 'enum body');
    return {
      type: 'EnumDeclaration',
      id: { type: 'Identifier', name: idTok.value, loc: this.loc(idTok) },
      members,
      loc: this.loc(start),
    };
  }

  /**
   * Parses an expression statement.
   * @public
   * @returns {object} ExpressionStatement AST node.
   */
  parseExpressionStatement() 
  {
    const start = this.peek();
    const expr = this.parseExpression();
    this.consumeSemi();
    return { type: 'ExpressionStatement', expression: expr, loc: this.loc(start) };
  }

  // ---- expressions --------------------------------------------------

  /**
   * Parses an expression.
   * @public
   * @returns {object} Expression AST node.
   */
  parseExpression() 
  {
    return this.parseAssignment();
  }

  /**
   * Parses an assignment expression.
   * @public
   * @returns {object} Expression AST node.
   */
  parseAssignment() 
  {
    const start = this.peek();
    const left = this.parseConditional();
    if (this.at('Punctuator') && ASSIGNMENT_OPERATORS.has(this.peek().value)) 
    {
      const operator = this.next().value;
      const right = this.parseAssignment();
      return { type: 'AssignmentExpression', operator, left, right, loc: this.loc(start) };
    }
    return left;
  }

  /**
   * Parses a conditional (ternary) expression.
   * @public
   * @returns {object} Expression AST node.
   */
  parseConditional() 
  {
    const start = this.peek();
    const test = this.parseBinary(1);
    if (this.atPunct('?')) 
    {
      this.next();
      const consequent = this.parseAssignment();
      this.expect('Punctuator', ':', 'ternary expression');
      const alternate = this.parseAssignment();
      return { type: 'ConditionalExpression', test, consequent, alternate, loc: this.loc(start) };
    }
    return test;
  }

  /**
   * Gets the normalized operator for the current token.
   * @public
   * @returns {string|null} Normalized operator string or null.
   */
  normalizedOperator() 
  {
    const t = this.peek();
    if (t.type === 'Punctuator' && PRECEDENCE[t.value] !== undefined) 
    {
      return t.value;
    }
    if (t.type === 'Keyword' && KEYWORD_OPERATOR_ALIASES[t.value] !== undefined) 
    {
      const alias = KEYWORD_OPERATOR_ALIASES[t.value];
      return PRECEDENCE[alias] !== undefined ? alias : null;
    }
    return null;
  }

  /**
   * Parses binary expressions using operator precedence.
   * @public
   * @param {number} minPrecedence - Minimum operator precedence.
   * @returns {object} Expression AST node.
   */
  parseBinary(minPrecedence) 
  {
    const start = this.peek();
    let left = this.parseUnary();
    for (;;) 
    {
      const op = this.normalizedOperator();
      if (!op) 
      {
        break;
      }
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrecedence) 
      {
        break;
      }
      this.next();
      const right = this.parseBinary(prec + 1);
      const isLogical = op === '&&' || op === '||' || op === '??';
      left = {
        type: isLogical ? 'LogicalExpression' : 'BinaryExpression',
        operator: op,
        left,
        right,
        loc: this.loc(start),
      };
    }
    return left;
  }

  /**
   * Parses a unary expression.
   * @public
   * @returns {object} Expression AST node.
   */
  parseUnary() 
  {
    const start = this.peek();
    if (
      (this.at('Punctuator', ['!', '-', '+', '~']) || this.atKeyword('not')) ||
      this.atPunct('++') || this.atPunct('--')
    ) 
    {
      const opTok = this.next();
      const operator = KEYWORD_OPERATOR_ALIASES[opTok.value] || opTok.value;
      const argument = this.parseUnary();
      const isUpdate = operator === '++' || operator === '--';
      return {
        type: isUpdate ? 'UpdateExpression' : 'UnaryExpression',
        operator,
        argument,
        prefix: true,
        loc: this.loc(start),
      };
    }
    return this.parsePostfix();
  }

  /**
   * Parses a postfix expression.
   * @public
   * @returns {object} Expression AST node.
   */
  parsePostfix() 
  {
    const start = this.peek();
    let expr = this.parseCallMemberExpression(this.parsePrimary());
    if (this.atPunct('++') || this.atPunct('--')) 
    {
      const operator = this.next().value;
      expr = { type: 'UpdateExpression', operator, argument: expr, prefix: false, loc: this.loc(start) };
    }
    return expr;
  }

  /**
   * Parses call and member expressions.
   * @public
   * @param {object} base - Base expression.
   * @returns {object} Expression AST node.
   */
  parseCallMemberExpression(base) 
  {
    let expr = base;
    for (;;) 
    {
      if (this.atPunct('.') || this.atPunct('?.')) 
      {
        const optional = this.peek().value === '?.';
        this.next();
        const propTok = this.expect('Identifier', undefined, 'member access');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: propTok.value, loc: this.loc(propTok) },
          computed: false,
          optional,
          loc: expr.loc,
        };
      }
      else if (this.atPunct('[')) 
      {
        this.next();
        // GML array/ds accessors: a[i], a[? key], a[| i], a[# c, r]
        if (this.atPunct('?') || this.atPunct('|') || this.atPunct('#')) 
        {
          this.next();
        }
        const property = this.parseExpression();
        let extra = null;
        if (this.atPunct(',')) 
        {
          this.next();
          extra = this.parseExpression();
        }
        this.expect('Punctuator', ']', 'index expression');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property,
          extra,
          computed: true,
          loc: expr.loc,
        };
      }
      else if (this.atPunct('(')) 
      {
        expr = this.parseCallExpression(expr);
      }
      else 
      {
        break;
      }
    }
    return expr;
  }

  /**
   * Parses a call expression.
   * @public
   * @param {object} callee - Callee expression.
   * @returns {object} CallExpression AST node.
   */
  parseCallExpression(callee) 
  {
    this.expect('Punctuator', '(', 'call arguments');
    const args = [];
    while (!this.atPunct(')') && !this.at('EOF')) 
    {
      args.push(this.parseExpression());
      if (this.atPunct(',')) 
      {
        this.next();
      }
      else 
      {
        break;
      }
    }
    this.expect('Punctuator', ')', 'call arguments');
    return { type: 'CallExpression', callee, arguments: args, loc: callee.loc };
  }

  /**
   * Parses primary expressions (literals, identifiers, arrays, structs, etc.).
   * @public
   * @returns {object} Expression AST node.
   */
  parsePrimary() 
  {
    const t = this.peek();

    if (t.type === 'Number') 
    {
      this.next();
      return { type: 'Literal', value: Number(t.value), raw: t.value, loc: this.loc(t) };
    }
    if (t.type === 'String') 
    {
      this.next();
      return { type: 'Literal', value: t.value, raw: t.value, isString: true, loc: this.loc(t) };
    }
    if (this.atKeyword(['true', 'false'])) 
    {
      this.next();
      return { type: 'Literal', value: t.value === 'true', raw: t.value, loc: this.loc(t) };
    }
    if (this.atKeyword('undefined')) 
    {
      this.next();
      return { type: 'Literal', value: undefined, raw: 'undefined', loc: this.loc(t) };
    }
    if (this.atKeyword(['self', 'other', 'noone', 'all', 'global'])) 
    {
      this.next();
      return { type: 'Identifier', name: t.value, loc: this.loc(t) };
    }
    if (t.type === 'Identifier') 
    {
      this.next();
      return { type: 'Identifier', name: t.value, loc: this.loc(t) };
    }
    if (this.atKeyword('function')) 
    {
      const fn = this.parseFunctionDeclaration();
      return { ...fn, type: 'FunctionExpression' };
    }
    if (this.atKeyword('new')) 
    {
      this.next();
      const callee = this.parseCallMemberExpression(this.parsePrimary());
      return { type: 'NewExpression', callee, loc: this.loc(t) };
    }
    if (this.atPunct('(')) 
    {
      this.next();
      const expr = this.parseExpression();
      this.expect('Punctuator', ')', 'parenthesized expression');
      return { type: 'ParenthesizedExpression', expression: expr, loc: this.loc(t) };
    }
    if (this.atPunct('[')) 
    {
      this.next();
      const elements = [];
      while (!this.atPunct(']') && !this.at('EOF')) 
      {
        elements.push(this.parseExpression());
        if (this.atPunct(',')) 
        {
          this.next();
        }
        else 
        {
          break;
        }
      }
      this.expect('Punctuator', ']', 'array literal');
      return { type: 'ArrayExpression', elements, loc: this.loc(t) };
    }
    if (this.atPunct('{')) 
    {
      this.next();
      const properties = [];
      while (!this.atPunct('}') && !this.at('EOF')) 
      {
        const keyTok = this.at('String') ? this.next() : this.expect('Identifier', undefined, 'struct literal');
        this.expect('Punctuator', ':', 'struct literal');
        const value = this.parseExpression();
        properties.push({
          type: 'Property',
          key: { type: 'Identifier', name: keyTok.value, loc: this.loc(keyTok) },
          value,
          loc: this.loc(keyTok),
        });
        if (this.atPunct(',')) 
        {
          this.next();
        }
        else 
        {
          break;
        }
      }
      this.expect('Punctuator', '}', 'struct literal');
      return { type: 'StructExpression', properties, loc: this.loc(t) };
    }

    this.error(`Unexpected token '${t.value === null ? 'EOF' : t.value}'`, t);
    this.next();
    return { type: 'Literal', value: undefined, raw: 'undefined', loc: this.loc(t) };
  }
}

/**
 * Parse GML source into an AST. Always returns a Program node; parse
 * errors are collected on `program.errors` rather than thrown, so the
 * linter can keep running rules against whatever did parse.
 * @public
 * @param {string} source - The raw GML source text.
 * @param {object} [options] - Parser options.
 * @returns {object} The Program AST node.
 */
function parse(source, options) 
{
  const parser = new Parser(source, options);
  return parser.parseProgram();
}

export { parse, Parser };