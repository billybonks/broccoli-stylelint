![Build Status](https://travis-ci.org/billybonks/broccoli-stylelint.svg?branch=master)
![](https://david-dm.org/billybonks/broccoli-stylelint.svg)
![downloads](https://img.shields.io/npm/dm/ember-cli-stylelint.svg)

Broccoli Style Lint
=====
Add [stylelint](http://stylelint.io/) to your broccoli build pipeline with ease.

**Currently doesn't support ignored files configuration**

Installation
====
`npm install --save-dev broccoli-stylelint`

Usage
=====

###Basic

```javascript
var StyleLint = require('broccoli-stylelint');

// path to files that need linting
var node = new StyleLint('app/styles');
```

the default output will be the same SCSS files, in the same tree structure.

###Generating Tests

`var node = new StyleLint('app/styles', {generateTests:true});`

Instead of receiving a tree of scss files, the plugin will output a tree of test files


**original tree**
```
.
├── scssfile1.sscss
└── nested-dir/
    ├── scssfile2.scss
```

**output tree**
```
.
├── scssfile1.stylelint-test.js
└── nested-dir/
    ├── scssfile2.stylelint-test.js
```

```javascript
var StyleLint = require('broccoli-stylelint');
var Funnel =      require('broccoli-funnel');
// path to files that need linting
var node = new StyleLint('app/styles');

// to extract tests from linter output
new Funnel(node, {
  srcDir:'tests',
});
```
See below for more advaned test configurations

Configuration
=====

`linterConfig` {Object}

Hash as specified by [stylelint](https://github.com/stylelint/stylelint/blob/master/docs/user-guide/node-api.md)

doesn't accept `files` option

`onError(errors)` {function}

A hook that allows you to do whatever you want, when an error occurs
 - errors `array of errors`

`testGenerator(relativePath, errors)` {function}

A hook that allows you generate tests.
 - relativePath `path of currently linted file`
- errors `array of errors if null then no errors occured`

`testFailingFiles` {boolean}

If true it will generate a unit test if the file fails lint.

`testPassingFiles` {boolean}

If true it  will generate a unit test if the passes fails lint.

`generateTests` {boolean}

If true it will generate tests for both passing and failing tests, overrides the testPassingFiles and testFailingFiles

`disableConsoleLogging` {boolean}

If true it will disable logging of errors to console
