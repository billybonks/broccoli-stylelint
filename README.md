[![Build Status](https://travis-ci.org/billybonks/broccoli-stylelint.svg?branch=master)](https://travis-ci.org/billybonks/broccoli-stylelint/branches)
![](https://david-dm.org/billybonks/broccoli-stylelint.svg)
[![downloads](https://img.shields.io/npm/dm/broccoli-stylelint.svg)](https://www.npmjs.com/package/broccoli-stylelint)

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

###Tests

Tests are automatically generated

If tests are generated the plugin will output a tree of test files

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

If test generation is disabled the plugin will return the original tree

** Disable test generation **
set the option `disableTestGeneration:true`

`var node = new StyleLint('app/styles', {disableTestGeneration:true});`

** Custom test generator **
If you want to build your own test generator set the `testGenerator` option to a function that will generate the tests

```javascript
StyleLinter.prototype.testGenerator = function(relativePath, errors) {
  var assertions = [];
  var module  = "module('Style Lint');\n";
  var test = "test('" + relativePath + " should pass stylelint', function() {\n";
  if(!errors){
    var assertion =  "  ok(\'true , "+relativePath+" passed stylelint\');";
    return module+test+assertion+"\n});\n";
  } else {
    for(var i = 0; i < errors.warnings.length; i++){
      var warning = errors.warnings[i];
      var index = warning.line+':'+warning.column;
      assertions.push("  ok(" + false + ", '"+index +" "+this.escapeErrorString(warning.text)+"');");
    }
    return module+test+assertions.join('\n')+"\n});\n";
  }
};
```

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

`disableTestGeneration` {boolean}

Will disable generation of tests

`disableConsoleLogging` {boolean}

If true it will disable logging of errors to console

`log` {boolean}
If true it will log results to console

`console` {object}
A custom console object
