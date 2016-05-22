![Build Status](https://travis-ci.org/billybonks/broccoli-style-lint.svg?branch=master)
![](https://david-dm.org/billybonks/broccoli-style-lint.svg)

Broccoli Style Lint
=====
Add style-lint to your build broccoli build pipeline with ease.

**Currently doesn't support ignored files configuration**

Installation
====
`npm install --save broccoli-style-lint`

Usage
=====

###Basic

```javascript
var StyleLinter = require('broccoli-style-lint');

// path to files that need linting
var node = new StyleLinter('app/styles');
```

the default output will be the same SCSS files, in the same tree structure.

###Generating Tests

`var node = new StyleLinter('app/styles', {generateTests:true});`

setting this option will generate qunit tests for the SCSS files.
the resulting tree structure will look like this

```
.
├── scss files in same directory structure
└── tests/
    ├── scssfile1.tests.js
    ├── scssfile2.tests.js (was nested in directory)
```

See below for more advaned test configurations

Configuration
=====

`linterConfig` {Object}

Hash as specified by [style-lint](https://github.com/stylelint/stylelint/blob/master/docs/user-guide/node-api.md)

doesn't accept `files` option

`onError` {function}

A hook that allows you to do whatever you want

`testFailingFiles` {boolean}

If true it will generate a unit test if the file fails lint.

`testPassingFiles` {boolean}

If true it  will generate a unit test if the passes fails lint.

`generateTests` {boolean}

If true it will generate tests for both passing and failing tests, overrides the testPassingFiles and testFailingFiles

`disableConsoleLogging` {boolean}

If true it will disable logging of errors to console
