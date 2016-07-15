var Filter =        require('broccoli-filter');
var escapeString =  require('js-string-escape');
var stylelint =     require('stylelint');
var merge =         require('merge');

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

  if(!options.linterConfig){
    options.linterConfig = {};
  }

  for(var i = 0; i < this.availableOptions.length; i++){
    var option = this.availableOptions[i];
    if(typeof options[option] === "undefined" || options[option] === null){
      continue;
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
  return Filter.prototype.build.call(this).finally(function() {
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
       if(_this.onError)
         _this.onError(results.results[0]);
       if(_this.testFailingFiles){
         return _this.testGenerator(relativePath, results.results[0]);
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
 /**
  * @method testGenerator
  *
  *  Alias of escapeString for hooks
  */
StyleLinter.prototype.escapeErrorString = escapeString;

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
      var index = warning.line+':'+warning.column;
      assertions.push("  ok(" + false + ", '"+index +" "+this.escapeErrorString(warning.text)+"');");
    }
    return module+test+assertions.join('\n')+"\n});\n";
  }
};

module.exports = StyleLinter;
