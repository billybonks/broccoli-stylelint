var Filter = require('broccoli-filter');
var stylelint = require('stylelint');
var merge = require('merge')
var path       = require('path');
var fs         = require('fs');
var escapeErrorString = require('js-string-escape');

StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter

/**
 * Creates a new StyleLinter instance.
 * Options
 * - linterConfig (StyleLint options)
 * @class
 */
function StyleLinter(inputNodes, options) {
  this.options = options || {};
  this.setSyntax(options.linterConfig.syntax);
  this.onError = options.onError;
  this.generateTests = options.generateTests;
  merge({
    configFile: process.cwd()+'/.stylelintrc.json',
    formatter: 'string',
    syntax: 'scss'
  }, options.linterConfig)

  /* Set passed options */

  for (var key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key]
    }
  }
  Filter.call(this, inputNodes, options);
}

/**
 * Sets the, file extensions that the broccoli plugin must parse
 * @param {string} syntax sass|css|less|sugarss
 */
StyleLinter.prototype.setSyntax = function(syntax) {
  var extensions = [];
  var targetExtension;
  if(!syntax)
    syntax = 'css'
  if(syntax === 'scss' || syntax === 'sass') {
    if(syntax == 'scss'){
      extensions.push('sass')
    } else {
      extensions.push('scss')
    }
    targetExtension = syntax;
  } else if(syntax === 'sugarss') {
    targetExtension = 'sss'
  } else {
    targetExtension = syntax
  }
  extensions.push(targetExtension);
  this.extensions = extensions;
  this.targetExtension = targetExtension;
}

/** Filter Class Overrides **/

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.build = function() {
  return Filter.prototype.build.call(this).finally(function() {
  })
}

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.processString = function(content, relativePath) {
  _this = this;
  this.linterConfig.code = content;
  return stylelint.lint(this.linterConfig).then(function(results){
    if(results.errored){
      if(_this.onError)
        _this.onError(results)
      if(_this.generateTests)
        _this.testGenerator(relativePath,results.output)
      console.log(results.output)
    }
  })
  .catch(function(err) {
    // do things with err e.g.
    console.error(err.stack);
  });
  return content;
};

/**
@method testGenerator

If test generation is enabled this method will generate a qunit test that will
be included and run by PhantomJS. If there are any errors, the test will fail
and print the reasons for failing. If there are no errors, the test will pass.
*/

StyleLinter.prototype.testGenerator = function(relativePath, errors) {
  var test = "module('Style Lint - " + path.dirname(relativePath) + "');\n" +
             "test('" + relativePath + " should pass style-lint', function() {\n" +
             "  ok(" + false + ", '" + relativePath + " should pass style-lint." + escapeErrorString('\n' + errors) + "');\n" +
             "});\n";
  var fileName = relativePath.split(path.sep)
  fileName = fileName[fileName.length - 1]
  var directory = this.outputPath + path.sep + 'tests';
  var testPath = directory + path.sep + fileName +'.test.js';
  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory);
  }
  fs.writeFileSync(testPath, test);
};

module.exports = StyleLinter;
