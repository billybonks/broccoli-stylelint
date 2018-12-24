/*eslint-env es6*/
'use strict';
const IgnorerFactory = require('./ignorer-factory');
const getTargetExtensions = require('./get-target-extensions');
const resolveInputDirectory  = require('./resolve-input-directory');
const Filter = require('broccoli-persistent-filter');
const stylelint = require('stylelint');
const path = require('path');
const chalk = require('chalk');


class BroccoliStyleLint extends Filter {

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
    this.inputNodesDirectory = resolveInputDirectory(inputNodes);
    this.ignorer = IgnorerFactory.create();
    this.targetExtension = 'stylelint-test.js' ;
    this.compileOptions(options);
    this.extensions = getTargetExtensions(this.linterConfig.syntax);
  }

  compileOptions(options){
        options = options || {linterConfig:{}};
        /* Used to extract and delete options from input hash */
        const availableOptions = [{name: 'onError'},
                                  {name: 'testingFramework', default:'qunit'},
                                  {name: 'testFailingFiles', default: true},
                                  {name: 'testPassingFiles', default: true},
                                  {name: 'testGenerator', default: require('./suite-generator')},
                                  {name: 'linterConfig', default: {}},
                                  {name: 'log', default: true},
                                  {name: 'console', default: console}];

        for(let i = 0; i < availableOptions.length; i++){
          let option = availableOptions[i];
          let name = option.name;
          let defaultValue = option.default || this[name];
          this[name] = typeof options[name] === 'undefined' ?  defaultValue : options[name];
        }

        this.linterConfig = Object.assign({formatter: 'string'}, this.linterConfig);
        this.linterConfig.files = null;
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
        results.output = self.testGenerator(relativePath, results, this.testingFramework);
        return results;
      } else if(!results.errored && self.testPassingFiles) {
        results.output = self.testGenerator(relativePath, results, this.testingFramework);
        return results;
      }
      return '';
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
      * @method getDestFilePath
      * determine whether the source file should
      * be processed, and optionally rename the output file when processing occurs.
      *
      * Return `null` to pass the file through without processing. Return
      * `relativePath` to process the file with `processString`. Return a
      * different path to process the file with `processString` and rename it.
      *
      * By default, if the options passed into the `Filter` constructor contain a
      * property `extensions`, and `targetExtension` is supplied, the first matching
      * extension in the list is replaced with the `targetExtension` option's value.
      *
      * NOTE: this is the original method with one line change to make sure relativePath retains the
      * file extension, allowing files with same name but different extension (e.g. style.css, style.scss)
      * to be written out to the same destination file
      * @override
      */
    getDestFilePath(relativePath, entry) {
      // NOTE: relativePath may have been moved or unlinked
      if (this.isDirectory(relativePath, entry)) {
        return null;
      }

      if (this.extensions == null) {
        return relativePath;
      }

      for (let i = 0, ii = this.extensions.length; i < ii; ++i) {
        let ext = this.extensions[i];
        if (relativePath.slice(-ext.length - 1) === '.' + ext) {
          if (this.targetExtension != null) {
            // modified code
            relativePath = relativePath + '.' + this.targetExtension;
          }
          return relativePath;
        }
      }

      return null;
    }

  /**
    * @method postProcess
    * This method is called after, the file has been linted:
    *  - Logs to console
    *  - Generate tests
    * @override
    */
  postProcess(results) {
    if(results) {
      if(results.errored){
        if(this.onError) {
          this.onError(results);
        }
        if(this.log) {
          this.console.log(results.log);
        }
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

}

module.exports = BroccoliStyleLint;