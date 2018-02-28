'use strict';

const Filter           = require('broccoli-persistent-filter');
const escapeString     = require('js-string-escape');
const stylelint        = require('stylelint');
const merge            = require('merge');
const path             = require('path');
const broccoliNodeInfo = require('broccoli-node-info');
const chalk            = require('chalk');


//Copied from stylelint, until style lint ignores files properly via node api
function buildIgnorer(){
  let ignore = require('ignore');
  let fs = require('fs');
  let DEFAULT_IGNORE_FILENAME = '.stylelintignore';
  let FILE_NOT_FOUND_ERROR_CODE = 'ENOENT';
  // The ignorer will be used to filter file paths after the glob is checked,
  // before any files are actually read
  let ignoreFilePath = DEFAULT_IGNORE_FILENAME;
  let absoluteIgnoreFilePath = path.isAbsolute(ignoreFilePath)
    ? ignoreFilePath
    : path.resolve(process.cwd(), ignoreFilePath);
  let ignoreText = '';
  try {
    ignoreText = fs.readFileSync(absoluteIgnoreFilePath, 'utf8');
  } catch (readError) {
    if (readError.code !== FILE_NOT_FOUND_ERROR_CODE) throw readError;
  }
  return ignore()
    .add(ignoreText);
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

class StyleLinter extends Filter {

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
  constructor(inputNodes, options) {
    super(inputNodes, options);

    this.options = options || {linterConfig:{}};
    this.inputNodesDirectory = resolveInputDirectory(inputNodes);
    this.ignorer = buildIgnorer();

    /* Used to extract and delete options from input hash */
    const availableOptions = [{name: 'onError'},
                              {name: 'disableTestGeneration'},
                              {name: 'testFailingFiles'},
                              {name: 'testPassingFiles'},
                              {name: 'testGenerator', default: StyleLinter.prototype.testGenerator},
                              {name: 'consoleLogger', default: StyleLinter.prototype.consoleLogger},
                              {name: 'linterConfig', default: {}},
                              {name: 'log', default: true},
                              {name: 'console', default: console}];

    for(let i = 0; i < availableOptions.length; i++){
      let option = availableOptions[i];
      let name = option.name;
      let defaultValue = option.default || this[name];
      this[name] = typeof options[name] === 'undefined' ?  defaultValue : options[name];
    }

    //TODO:remove this deprecation on v1 release
    if(typeof options['disableConsoleLogging'] !== 'undefined'){
      console.warn('After 2.0 release "disableConsoleLogging" propety will be removed in favour of "log"');
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
  }

  /**
   * Sets the, file extensions that the broccoli plugin must parse
   * @param {string} syntax sass|css|less|sugarss
   */
  setSyntax(config) {
    let syntax = config.syntax;
    let extensions = [];
    let targetExtension;
    if(!syntax){
      syntax = 'scss';
      this.linterConfig.syntax = syntax;
    }
    if(syntax === 'sugarss') {
      targetExtension = 'sss';
    } else {
      targetExtension = syntax;
    }
    if(syntax === 'css'){
      config.syntax = '';
    }
    extensions.push(targetExtension);
    if(this.testPassingFiles || this.testFailingFiles) {
      targetExtension = 'stylelint-test.js';
    } else {
      console.warn('After 2.0 release if not tests are disabled, broccoli-stylelint will not return the original files');
    }
    this.extensions = extensions;
    this.targetExtension = targetExtension;
  }

  /** Filter Class Overrides **/

  /**
   * Entry point for broccoli build
   * @override
   */
  build() {
    return Filter.prototype.build.call(this).finally(function() {
    });
  }

  /**
   * This method is executed for every scss file, it:
   *  - Calls onError
   * @override
   */
  processString(content, relativePath) {
    let self = this;
    this.linterConfig.code = content;
    this.linterConfig.codeFilename = path.join(this.inputNodesDirectory, relativePath);
    if(this.ignorer.ignores(this.linterConfig.codeFilename)){
      return;
    }
    return stylelint.lint(this.linterConfig).then(results => {
      //sets the value to relative path otherwise it would be absolute path
      results = self.processResults(results, relativePath);
      if(results.errored && self.testFailingFiles) {
      results.output = self.testGenerator(relativePath, results);
      } else if(!results.errored && self.testPassingFiles) {
        results.output = self.testGenerator(relativePath);
      }
      return results;
    }).catch(err => {
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
  }

  /**
    * @method postProcess
    * This method is called after, the file has been linted:
    *  - Logs to console
    *  - Generate tests
    * @override
    */
  postProcess(results, relativePath) {
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
  }

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
  processResults(results, relativePath) {
    let resultsInner = results.results[0];
    resultsInner.errored = results.errored;
    resultsInner.source = relativePath;
    delete results.results;
    results.log = results.output;
    Object.assign(results, resultsInner);
    results.source = relativePath;
    results.output = '';
    return results;
  }

  /**
    * @method testGenerator
    *
    *  Alias of escapeString for hooks
    */
  escapeErrorString() {
    return escapeString.apply(this, arguments);
  }

  /**
    * @method consoleLogger
    *
    *  custom console logger
    */
  consoleLogger(results) {
    this.console.log(results.log);
  }

  /**
    * @method testGenerator
    *
    *  Geneartes tests.
    */
  testGenerator(relativePath, errors) {
    let assertions = [];
    let module  = 'module(\'Style Lint\');\n';
    let test = 'test(\'' + relativePath + ' should pass stylelint\', function() {\n';
    if(!errors){
      let assertion =  '  ok(\'true , '+relativePath+' passed stylelint\');';
      return module+test+assertion+'\n});\n';
    } else {
      for(let i = 0; i < errors.warnings.length; i++){
        let warning = errors.warnings[i];
        let index = warning.line+':'+warning.column;
        assertions.push('  ok(' + false + ', \''+index +' '+this.escapeErrorString(warning.text)+'\');');
      }
      return module+test+assertions.join('\n')+'\n});\n';
    }
  }
}

module.exports = StyleLinter;
