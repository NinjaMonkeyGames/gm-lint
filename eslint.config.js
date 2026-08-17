// eslint.config.js
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import jsoncPlugin from 'eslint-plugin-jsonc';
import * as jsoncParser from 'jsonc-eslint-parser';
import jsonSchemaValidator from 'eslint-plugin-json-schema-validator';

// --- Constants for rule configuration ---
const MAX_COMPLEXITY = 10;
const MAX_LINES = 300;
const MAX_PARAMS = 4;
const INDENT_SPACES = 2;
const SWITCH_CASE_INDENT = 1;

// --- Helper logic to read .gitignore ---
const gitignorePath = path.resolve(process.cwd(), '.gitignore');
const gitignorePatterns = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.startsWith('#'))
  : [];
// ---------------------------------------

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // 1. Global ignores configuration
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/coverage/',
      'package-lock.json',
      ...gitignorePatterns,
    ],
  },

  // 2. Base configs
  eslint.configs.recommended,
  jsdoc.configs['flat/recommended'],

  // 3a. JS strict rules (NO TypeScript rules here)
  {
    files: ['**/*.{js,jsx}'],

    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },

    rules: {
      // --- General JS strictness ---
      'no-console': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'complexity': ['warn', MAX_COMPLEXITY],
      'max-lines': ['warn', { max: MAX_LINES, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', MAX_PARAMS],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'brace-style': ['error', 'allman', { allowSingleLine: false }],
      'indent': ['error', INDENT_SPACES, { SwitchCase: SWITCH_CASE_INDENT }],

      // --- JSDoc strictness ---
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-tag-names': [
        'error',
        {
          definedTags: ['remarks', 'example', 'defaultValue'],
        },
      ],
    },
  },

  // 3b. Apply typescript-eslint recommended config ONLY to ts/tsx
  ...tseslint.configs.recommended.map(cfg => ({
    ...cfg,
    files: ['**/*.{ts,tsx}'],
  })),

  // 3c. TS strict rules & JSDoc configuration
  {
    files: ['**/*.{ts,tsx}'],

    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },

    rules: {
      // --- JSDoc strictness ---
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-tag-names': [
        'error',
        {
          definedTags: ['remarks', 'example', 'defaultValue'],
        },
      ],

      // --- TypeScript strictness ---
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      // --- General JS/TS strictness ---
      'no-console': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'complexity': ['warn', MAX_COMPLEXITY],
      'max-lines': ['warn', { max: MAX_LINES, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', MAX_PARAMS],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'brace-style': ['error', 'allman', { allowSingleLine: false }],
      'indent': ['error', INDENT_SPACES, { SwitchCase: SWITCH_CASE_INDENT }],
    },
  },

  // 4. JSON/JSONC strict rules
  {
    files: ['**/*.json', '**/*.jsonc'],
    plugins: {
      // @ts-expect-error -- Eslint plugin has incorrect types
      jsonc: jsoncPlugin,
      'json-schema-validator': jsonSchemaValidator,
    },
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      ...jsoncPlugin.configs['recommended-with-jsonc'].rules,

      // Strict formatting
      'jsonc/indent': ['error', INDENT_SPACES],
      'jsonc/quotes': ['error', 'double'],
      'jsonc/array-bracket-spacing': ['error', 'never'],
      'jsonc/object-curly-spacing': ['error', 'always'],
      'jsonc/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'jsonc/comma-dangle': ['error', 'never'],

      // Strict correctness
      'jsonc/sort-keys': ['error', { order: { type: 'asc' }, pathPattern: '^.*$' }],
      'jsonc/no-dupe-keys': 'error',
      'jsonc/no-octal-escape': 'error',
      'jsonc/no-bigint-literals': 'error',
      'jsonc/no-numeric-separators': 'error',
      'jsonc/no-comments': 'error',

      // Validate against schemas (example: package.json)
      'json-schema-validator/no-invalid': ['error', {
        schemas: [
          {
            fileMatch: ['package.json'],
            schema: 'https://json.schemastore.org/package.json'
          }
        ]
      }]
    },
  },
];