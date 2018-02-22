'use strict';

module.exports = {
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 6
  },
  env: {
    node: true
  },
  rules: {
    'no-console': 'off',
    'quotes': ['error', 'single', {
      'allowTemplateLiterals': true,
    }],
    'semi': ['error', 'always'],
  },
  overrides: [{
    files: ['tests/**/*.js'],
    env: {
      jest: true,
    }
  }],
};
