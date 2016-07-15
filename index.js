var Filter =        require('broccoli-filter');
var escapeString =  require('js-string-escape');
var stylelint =     require('stylelint');
var merge =         require('merge');
var chalk =         require('chalk');

/* Setup class */
StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter;

/* Used to extract and delete options from input hash */
StyleLinter.prototype.availableOptions = ['onError',
                                          'generateTests',
                                          'testFailingFiles',
                                          'testPassingFiles' ,
                                          'testGenerator',
                                          'linterConfig',
                                          'disableConsoleLogging'];

/**
 * Creates a new StyleLinter instance.
 * Options
 * - linterConfig           (StyleLint options)
 * - onError                (Hook when error occurs)
 * - testGenerator          (Hook for custom test generation)
 * - generateTests          (Generate tests for all files)
 * - testFailingFiles       (Generate tests for failing files)
 * - testPassingFiles       (Generate tests for passing files)
 * - disableConsoleLogging  (Disables error logging in console)
 * @class
 */
function StyleLinter(inputNodes, options) {
  this.options = options || {linterConfig:{}};
  this._errors = [];
  this.log = true;

  if(!options.linterConfig){
    options.linterConfig = {};
  }

  for(var i = 0; i < this.availableOptions.length; i++){
    var option = this.availableOptions[i];
    if( option === 'testGenerator'){
      if(!options[option]){
        continue;
      }
    }
    this[option] = options[option];
    delete options[option];
  }

  merge(this.linterConfig, {
    formatter: 'string'
  });

  if(this.generateTests === false || this.generateTests === true){
    this.testFailingFiles = this.generateTests;
    this.testPassingFiles = this.generateTests;
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
  if(this.testPassingFiles || this.testFailingFiles)
    targetExtension = 'stylelint-test.js';
  this.extensions = extensions;
  this.targetExtension = targetExtension;
};

/** Filter Class Overrides **/

/**
 * Entry point for broccoli build
 * @override
 */
StyleLinter.prototype.build = function() {
  var self = this;

  return Filter.prototype.build.call(this).finally(function() {
    if (self._errors.length > 0) {
      var label = ' StyleLint Error' + (self._errors.length > 1 ? 's' : '');
      self.console.log('\n' + self._errors.join('\n'));
      self.console.log(chalk.yellow('===== ' + self._errors.length + label + '\n'));
    }
  });
};

/**
 * This method is executed for every scss file, it:
 *  - Calls onError
 *  - Logs to console
 *  - Generate tests
 * @override
 */
 StyleLinter.prototype.processString = function(content, relativePath) {
   var _this = this;
   this.linterConfig.code = content;
   this.linterConfig.codeFilename = relativePath;
   return stylelint.lint(this.linterConfig).then(function(results){
      //sets the value to relative path otherwise it would be absolute path
     results.results[0].source = relativePath;
     if(results.errored){
       var errors = results.results[0];
       if(_this.onError)
        if(this.log){
          for(var i = 0; i < errors.warnings.length; i++){
            this.logError(this.errorToString(errors.warnings[i]));
          }
        }
         _this.onError(errors);
       if(_this.testFailingFiles){
         return _this.testGenerator(relativePath, errors);
       } else {
         return '';
       }
       if(!_this.disableConsoleLogging )
         console.log(results.output);
     } else {
       if(_this.testPassingFiles){
         return _this.testGenerator(relativePath);
       }else {
         return '';
       }
     }

   })
   .catch(function(err) {
     // do things with err e.g.
     console.error(err.stack);
   });
 };

 StyleLinter.prototype.logError = function(message, color) {
  color = color || 'red';

  this._errors.push(chalk[color](message) + "\n");
};
 /**
  * @method testGenerator
  *
  *  Alias of escapeString for hooks
  */
StyleLinter.prototype.escapeErrorString = escapeString;

/**
 * @method testGenerator
 *
 *  Creates a pretty error string from error object.
 */
StyleLinter.prototype.errorToString = function(error){
  return error.line+':'+error.column + " "+this.escapeErrorString(error.text);
};
 /**
  * @method testGenerator
  *
  *  Geneartes tests.
  */
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
      assertions.push("  ok(" + false + ", '"+ this.errorToString(warning)+ "');");
    }
    return module+test+assertions.join('\n')+"\n});\n";
  }
};

module.exports = StyleLinter;
