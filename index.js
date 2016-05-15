var Filter = require('broccoli-filter');
var stylelint = require('stylelint');
var merge = require('merge')

StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter

/**
 * Creates a new StyleLinter instance.
 * @class
 */
function StyleLinter(inputNodes, options) {
  this.options = options || {};
  this.linterConfig = options.linter;
  merge({
    configFile: process.cwd()+'/.stylelintrc.json',
    formatter: 'json',
    syntax: 'scss'
  },this.linterConfig)
  delete options.linter;
  Filter.call(this, inputNodes, options);
}


/** Filter Class Overrides **/

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.build = function() {
  return Filter.prototype.build.call(this).finally(function() {
    console.log('done')
  })
}

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.processString = function(content, relativePath) {
  this.linterConfig.code = content;
  return stylelint.lint(this.linterConfig)
  .catch(function(err) {
    // do things with err e.g.
    console.error(err.stack);
  });
};

module.exports = StyleLinter;
