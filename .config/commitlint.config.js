////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                            COMMITLINT CONSTANTS                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import signedOffByRule from './signed-off-by-regex.js';

// Rule severity

const ERROR = 2;        // Marks a rule as an error
//const WARN = 1;         // Marks a rule as a warning

// Enforcement

const ALWAYS = 'always'; // Always enforce the rule
const NEVER = 'never';   // Never allow violation

// Commit message length limits

const HEADER_MAX_LENGTH = 72;
const SUBJECT_MAX_LENGTH = 50;
const BODY_MIN_LENGTH = 10;
const BODY_MAX_LINE_LENGTH = 72;
const FOOTER_MAX_LINE_LENGTH = 72;

// Text case rules

const LOWER_CASE = 'lower-case';
const SNAKE_CASE = 'snake-case';
const SENTENCE_CASE = 'sentence-case';

// Special strings

const SIGNED_OFF_BY = 'Signed-off-by';

export default
{
  // Extend the conventional commit config
  
  extends: ['@commitlint/config-conventional'],

  // Define custom types and enforce specific rules
  
  rules:
  {
    // Custom rules

    'signed-off-by-regex': [ERROR, ALWAYS],             // Require a "Signed-off-by" line in commit messages

    // Conventional commit rules

    // Header rules

    'header-max-length': [ERROR, ALWAYS, HEADER_MAX_LENGTH],           // Limit header length to 72 characters

    // Subject rules

    'subject-max-length': [ERROR, ALWAYS, SUBJECT_MAX_LENGTH],         // Limit subject line length to 50 characters
    'subject-empty': [ERROR, NEVER],                                   // Disallow empty subjects in commit messages
    'subject-case': [ERROR, ALWAYS, LOWER_CASE],                       // Enforce lowercase subject text

    // Type rules

    'type-empty': [ERROR, NEVER],                                      // Disallow empty types in commit messages
    'type-case': [ERROR, ALWAYS, SNAKE_CASE],                          // Enforce lowercase type text

    // Scope rules

    'scope-case': [ERROR, ALWAYS, SNAKE_CASE],                         // Enforce lowercase scope text
    'scope-empty': [ERROR, NEVER],                                     // Require a scope for commits

    // Body and footer rules

    'body-empty': [ERROR, NEVER],                                      // Disallow empty bodies in commit messages
    'body-min-length': [ERROR, ALWAYS, BODY_MIN_LENGTH],               // Require a minimum body length of 10 characters
    'body-case': [ERROR, ALWAYS, SENTENCE_CASE],                       // Enforce sentence-case body text
    'body-max-line-length': [ERROR, ALWAYS, BODY_MAX_LINE_LENGTH],     // Limit body line length to 72 characters

    // Footer rules
    
    'footer-leading-blank': [ERROR, ALWAYS],                           // Require a blank line before the footer
    'footer-max-line-length': [ERROR, ALWAYS, FOOTER_MAX_LINE_LENGTH], // Enforce footer length to 72 characters
    'footer-empty': [ERROR, NEVER],                                    // Disallow empty footers in commit messages

    // Other rules
    
    'references-empty': [ERROR, NEVER],                             // Disallow empty references in commit messages
    'signed-off-by': [ERROR, ALWAYS, SIGNED_OFF_BY],                // Require a "Signed-off-by" line in commit messages

    // Enforce a list of allowed types (basic types commonly used in conventional commits)

    'type-enum':
    [
      ERROR,
      ALWAYS,
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc., no code change)
        'refactor', // Refactor without adding new features or fixing bugs
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Changes to build system or dependencies
        'ci',       // Continuous integration-related changes
        'chore',    // Other changes that don't modify source or test files
        'revert',   // Reverts a previous commit
      ]
    ],

    // Enforce scope format (optional, but recommended for organized commit history)

    'scope-enum':
    [
      ERROR,
      ALWAYS,
      [
        'core',     // For core changes
        'api',      // For API-related changes
        'ui',       // For UI-related changes
        'auth',     // For authentication changes
        'db',       // For database changes
        'deps',     // For dependency updates
        'tests',    // For test-related changes
        'config',   // For configuration updates
        'security', // For security-related changes
        'rebase',   // For rebase-related changes
      ]
    ],
  },

  plugins: [signedOffByRule], // Use the custom "Signed-off-by" rule
};
