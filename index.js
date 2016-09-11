var Filter =        require('broccoli-persistent-filter');
var escapeString =  require('js-string-escape');
var stylelint =     require('stylelint');
var merge =         require('merge');

/* Setup class */
StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter;

/* Used to extract and delete options from input hash */
StyleLinter.prototype.availableOptions = ['onError',
                                          'disableTestGeneration',
                                          'testFailingFiles',
                                          'testPassingFiles' ,
                                          'testGenerator',
                                          'linterConfig',
                                          'log',
                                          'console'];

/**
 * Creates a new StyleLinter instance.
 * Options
 * - linterConfig           (StyleLint options)
 * - onError                (Hook when error occurs)
 * - testGenerator          (Hook for custom test generation)
 * - disableTestGeneration  (Disable generatation tests for all files)
 * - testFailingFiles       (Generate tests for failing files)
 * - testPassingFiles       (Generate tests for passing files)
 * - log                    (Disables error logging in console)
 * - console                (Custom console)
 * @class
 */
function StyleLinter(inputNodes, options) {
  this.options = options || {linterConfig:{}};

  if(!options.linterConfig){
    options.linterConfig = {};
  }

  this.log = true;
  if(typeof options['disableConsoleLogging'] !== "undefined"){
    console.warn('"disableConsoleLogging" propety has been deprecated in favour of "log"');
    this.log = !options['disableConsoleLogging'];
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

  if(typeof this.testFailingFiles === 'undefined' && typeof this.testPassingFiles === 'undefined' && typeof this.disableTestGeneration === 'undefined'){
    this.testFailingFiles = true;
    this.testPassingFiles = true;
  }else if( typeof this.disableTestGeneration !== 'undefined' ){
    this.testFailingFiles = typeof this.testFailingFiles === 'undefined' ? !this.disableTestGeneration : this.testFailingFiles;
    this.testPassingFiles  = typeof this.testPassingFiles === 'undefined' ? !this.disableTestGeneration : this.testPassingFiles;
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
  if(syntax === 'sugarss') {
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
 * @override
 */
StyleLinter.prototype.processString = function(content, relativePath) {
 var self = this;
 this.linterConfig.code = content;
 this.linterConfig.codeFilename = relativePath;
 return stylelint.lint(this.linterConfig).then(function(results){
  //sets the value to relative path otherwise it would be absolute path
  results = self.processResults(results, relativePath);
  if(results.errored && self.testFailingFiles) {
   results.output = self.testGenerator(relativePath, results);
  } else if(!results.errored && self.testPassingFiles) {
     results.output = self.testGenerator(relativePath);
  }
  return results;
 }).catch(function(err) {
   console.error(err.stack);
 });
};

/**
  * @method postProcess
  * This method is called after, the file has been linted:
  *  - Logs to console
  *  - Generate tests
  * @override
  */
StyleLinter.prototype.postProcess = function(results, relativePath) {
 if(results.errored){
   if(this.onError) {
    this.onError(results);
   }
   if(this.log)
    this.console.log(results.log)
  }
  return results;
};

/**
  * @method processResults
  *
  *  Reformats default results object
  *  {
  *   errored: boolean if file errored or not,
  *   output: String contains test if generate test is true,
  *   log: String default logging string,
  *   source: String relitivePath,
  *   deprecations: Array of errors,
  *   invalidOptionWarnings: Array,
  *   warnings: Array of errors,
  *   ignored: Array ignored files,
  *   _postcssResult: Object for postcss
  *  }
  */
StyleLinter.prototype.processResults = function(results, relativePath) {
 var resultsInner = results.results[0];
 resultsInner.errored = results.errored;
 resultsInner.source = relativePath;
 delete results.results;
 results.log = results.output;
 Object.assign(results, resultsInner);
 results.source = relativePath;
 results.output = '';
 return results;
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
