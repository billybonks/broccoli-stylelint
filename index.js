var Filter = require('broccoli-filter');
var stylelint = require('stylelint');
var merge = require('merge');
var path       = require('path');
var fs         = require('fs');
var escapeErrorString = require('js-string-escape');

StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter;
StyleLinter.prototype.availableOptions = ['onError', 'generateTests', 'linterConfig', 'disableConsoleLogging'];

/**
 * Creates a new StyleLinter instance.
 * Options
 * - linterConfig           (StyleLint options)
 * - onError                (Hook when error occurs)
 * - generateTests          (Hook when error occurs)
 * - disableConsoleLogging  (Disables error logging in console)
 * @class
 */

 //test config file
function StyleLinter(inputNodes, options) {
  this.options = options || {linterConfig:{}};

  for(var i = 0; i < this.availableOptions.length; i++){
    var option = this.availableOptions[i];
    this[option] = options[option];
    delete options[option];
  }

  merge({
    configFile: '/.stylelintrc',
    syntax: 'scss',
    formatter: 'string'
  }, this.linterConfig);

  if(this.linterConfig.formatter !== 'verbose' || this.linterConfig.formatter !== 'string'){
      this.linterConfig.formatter = 'string';
  }

  this.linterConfig.files = null;

  this.setSyntax(this.linterConfig.syntax);

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
    syntax = 'scss';
    this.linterConfig.syntax = syntax;
  if(syntax === 'scss' || syntax === 'sass') {
    if(syntax === 'scss'){
      extensions.push('sass');
    } else {
      extensions.push('scss');
    }
    targetExtension = syntax;
  } else if(syntax === 'sugarss') {
    targetExtension = 'sss';
  } else {
    targetExtension = syntax;
  }
  extensions.push(targetExtension);
  this.extensions = extensions;
  this.targetExtension = targetExtension;
};

/** Filter Class Overrides **/

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.build = function() {
  return Filter.prototype.build.call(this).finally(function() {
  });
};

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.processString = function(content, relativePath) {
  var _this = this;
  this.linterConfig.code = content;
  this.linterConfig.fileName = relativePath;
  return stylelint.lint(this.linterConfig).then(function(results){
    if(results.errored){
      if(_this.onError)
        _this.onError(results);
      if(_this.generateTests){
        var testString = _this.testGenerator(relativePath, results.results[0]);
        _this.writeTest(relativePath, testString);
      }
      if(!_this.disableConsoleLogging )
        console.log(results.output);
    }
  })
  .catch(function(err) {
    // do things with err e.g.
    console.error(err.stack);
  });
};

/**
@method testGenerator

If test generation is enabled this method will generate a qunit test that will
be included and run by PhantomJS. If there are any errors, the test will fail
and print the reasons for failing. If there are no errors, the test will pass.
*/
StyleLinter.prototype.testGenerator = function(relativePath, errors) {
  var assertions = []
  var module  = "module('Style Lint - " + path.dirname(relativePath) + "');\n";
  var test = "test('" + relativePath + " should pass style-lint', function() {\n"
  for(var i = 0; i < errors.warnings.length; i++){
    var warning = errors.warnings[i];
    var index = warning.line+':'+warning.column
    assertions.push("  ok(" + false + ", '"+index +" "+ warning.text+"');")
  }
  return module+test+assertions.join('\n')+"\n});\n";
};

/**
@method writeTest

Writes error test to directory test directory
*/
StyleLinter.prototype.writeTest = function(relativePath, test) {
  var fileName = relativePath.split(path.sep);
  fileName = fileName[fileName.length - 1];
  var directory = this.outputPath + path.sep + 'tests';
  var testPath = directory + path.sep + fileName +'.test.js';
  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory);
  }
  fs.writeFileSync(testPath, test);
};

module.exports = StyleLinter;
