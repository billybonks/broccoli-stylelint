var Filter =           require('broccoli-persistent-filter');
var escapeString =     require('js-string-escape');
var stylelint =        require('stylelint');
var merge =            require('merge');
var path =             require('path');
var broccoliNodeInfo = require('broccoli-node-info');
var chalk            = require('chalk');

//Copied from stylelint, until style lint ignores files properly via node api
function buildIgnorer(){
  var ignore = require('ignore');
  var fs = require('fs');
  var DEFAULT_IGNORE_FILENAME = '.stylelintignore';
  var FILE_NOT_FOUND_ERROR_CODE = 'ENOENT';
  // The ignorer will be used to filter file paths after the glob is checked,
  // before any files are actually read
  var ignoreFilePath = DEFAULT_IGNORE_FILENAME;
  var absoluteIgnoreFilePath = path.isAbsolute(ignoreFilePath)
    ? ignoreFilePath
    : path.resolve(process.cwd(), ignoreFilePath);
  var ignoreText = '';
  try {
    ignoreText = fs.readFileSync(absoluteIgnoreFilePath, 'utf8');
  } catch (readError) {
    if (readError.code !== FILE_NOT_FOUND_ERROR_CODE) throw readError;
  }
  return ignore()
    .add(ignoreText)
}

function resolveInputDirectory(inputNodes) {
  if (typeof inputNodes === 'string') {
    return inputNodes;
  }

  const nodeInfo = broccoliNodeInfo.getNodeInfo(inputNodes);
  if (nodeInfo.nodeType === 'source') {
    return nodeInfo.sourceDirectory;
  }

  if (nodeInfo.inputNodes.length > 1) {
    throw new Error('broccoli-stylelint can only handle one:* broccoli nodes, but part of the given input pipeline is a many:* node. (broccoli-merge-trees is an example of a many:* node) Please perform many:* operations after linting.');
  }

  return resolveInputDirectory(nodeInfo.inputNodes[0]);
}

/* Setup class */
StyleLinter.prototype = Object.create(Filter.prototype);
StyleLinter.prototype.constructor = StyleLinter;

/* Used to extract and delete options from input hash */
StyleLinter.prototype.availableOptions = [{name: 'onError'},
                                          {name: 'disableTestGeneration'},
                                          {name: 'testFailingFiles'},
                                          {name: 'testPassingFiles'},
                                          {name: 'testGenerator', default: StyleLinter.prototype.testGenerator},
                                          {name: 'consoleLogger', default: StyleLinter.prototype.consoleLogger},
                                          {name: 'linterConfig', default: {}},
                                          {name: 'log', default: true},
                                          {name: 'console', default: console}];

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
  this.inputNodesDirectory = resolveInputDirectory(inputNodes);
  this.ignorer = buildIgnorer();
  for(var i = 0; i < this.availableOptions.length; i++){
    var option = this.availableOptions[i];
    var name = option.name;
    var defaultValue = option.default || this[name];
    this[name] = typeof options[name] === 'undefined' ?  defaultValue : options[name];
  }

  //TODO:remove this deprecation on v1 release
  if(typeof options['disableConsoleLogging'] !== 'undefined'){
    console.warn(''disableConsoleLogging' propety has been deprecated in favour of 'log'');
    this.log = !options['disableConsoleLogging'];
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

  this.setSyntax(this.linterConfig);

  Filter.call(this, inputNodes, options);
}

/**
 * Sets the, file extensions that the broccoli plugin must parse
 * @param {string} syntax sass|css|less|sugarss
 */
StyleLinter.prototype.setSyntax = function(config) {
  var syntax = config.syntax;
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
  if(syntax === 'css'){
    config.syntax = '';
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
 this.linterConfig.codeFilename = path.join(this.inputNodesDirectory, relativePath);
 if(this.ignorer.ignores(this.linterConfig.codeFilename)){
   return;
 }
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
   console.error(chalk.red('======= Something went wrong running stylelint ======='));
   if(err.code === 78){
     if(err.message.indexOf('No configuration provided') > -1){
       console.error(chalk.red('No stylelint configuration found please create a .stylelintrc file in the route directory'));
     } else {
       console.error(chalk.red(err.message));
     }
   } else {
     console.error(err.stack);
   }
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
  if(results) {
    if(results.errored){
      if(this.onError) {
       this.onError(results);
      }
      if(this.log)
       this.consoleLogger(results, relativePath);
     }
     return results;
  } else {
    return {};
  }
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
  * @method consoleLogger
  *
  *  custom console logger
  */
StyleLinter.prototype.consoleLogger = function(results, relativePath) {
  this.console.log(results.log);
};

/**
  * @method testGenerator
  *
  *  Geneartes tests.
  */
StyleLinter.prototype.testGenerator = function(relativePath, errors) {
  var assertions = [];
  var module  = 'module('Style Lint');\n';
  var test = 'test('' + relativePath + ' should pass stylelint', function() {\n';
  if(!errors){
    var assertion =  '  ok(\'true , '+relativePath+' passed stylelint\');';
    return module+test+assertion+'\n});\n';
  } else {
    for(var i = 0; i < errors.warnings.length; i++){
      var warning = errors.warnings[i];
      var index = warning.line+':'+warning.column;
      assertions.push('  ok(' + false + ', ''+index +' '+this.escapeErrorString(warning.text)+'');');
    }
    return module+test+assertions.join('\n')+'\n});\n';
  }
};

module.exports = StyleLinter;
