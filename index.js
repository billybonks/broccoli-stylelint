var Filter = require('broccoli-filter');
var stylelint = require('stylelint');
var merge = require('merge')

StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter

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


StyleLinter.prototype.build = function() {
  return Filter.prototype.build.call(this).finally(function() {
    console.log('done')
  })
}

/** Filter Class Overrides **/

StyleLinter.prototype.extensions = ['sass', 'scss'];;
StyleLinter.prototype.targetExtension = 'scss';

StyleLinter.prototype.processString = function(content, relativePath) {
  this.linterConfig.code = content;
  return stylelint.lint(this.linterConfig)
  .catch(function(err) {
    // do things with err e.g.
    console.error(err.stack);
  });
};

module.exports = StyleLinter;
