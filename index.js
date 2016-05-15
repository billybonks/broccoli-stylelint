var Filter = require('broccoli-filter');
var stylelint = require('stylelint');
var merge = require('merge')

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
  this.linterConfig = options.linterConfig;
  this.setSyntax(options.linterConfig.syntax);
  merge({
    configFile: process.cwd()+'/.stylelintrc.json',
    formatter: 'json',
    syntax: 'scss'
  },this.linterConfig)
  delete options.linterConfig;
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
