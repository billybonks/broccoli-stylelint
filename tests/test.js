'use strict';

var co = require('co');
var chaiAsPromised = require('chai-as-promised');
var StyleLinter =    require('..');
var walkSync =       require('walk-sync');
var broccoli =       require('broccoli');
var chai =           require('chai');
var spies =          require('chai-spies');
var merge =          require('merge');
var fs =             require('fs');

chai.use(chaiAsPromised);
chai.use(spies);

var expect = chai.expect;
var builder, lintErrors;

describe('Broccoli StyleLint Plugin', function() {
  afterEach(function() {
    if (builder.cleanup) {
      builder.cleanup();
    }
  });

  beforeEach(function() {
    lintErrors = [];
  });

  describe('Broccoli build', function() {
    it('catches errors', co.wrap(function *() {
      yield buildAndLint('tests/fixtures/has-errors');
      expect(lintErrors[0].warnings).to.have.lengthOf(2);
    }));

    it('ignores file specified config', co.wrap(function *() {
      yield buildAndLint('tests/fixtures/ignore');
      expect(lintErrors).to.have.lengthOf(0);
    }));

    it('stylelint plugins work', co.wrap(function *() {
      yield buildAndLint('tests/fixtures/test-plugin', {linterConfig:{syntax:'scss', configFile:'tests/fixtures/.bemTestStylelintrc'}});
      expect(lintErrors[0].warnings).to.have.lengthOf(1);
    }));

    it('returns usefull source name onError', co.wrap(function *() {
      yield buildAndLint('tests/fixtures/test-plugin', {linterConfig:{syntax:'scss', configFile:'tests/fixtures/.bemTestStylelintrc'}});
      expect(lintErrors[0].source).to.equal('has-error.scss');
    }));
  });

  describe('Configuration', function() {

    describe('Formatter', function(){

      it('uses string formatter by default', function(){
        builder = new StyleLinter('', {});
        expect(builder.linterConfig.formatter).to.eql('string');
      });

    });

    describe('Syntax', function(){

      function assertExtensions(syntax, targetExtension, extensions){
        var options = {linterConfig:{syntax:syntax}};
        builder = new StyleLinter('', options);
        expect(builder.extensions).to.eql(extensions);
      }

      it('accepts less',function(){
        var extension = 'less';
        assertExtensions(extension, extension, [extension]);
      });

      it('accepts scss',function(){
        var extension = 'scss';
        assertExtensions(extension, extension, [extension]);
      });

      it('accepts sugarss',function(){
        var extension = 'sss';
        assertExtensions('sugarss', extension, [extension]);
      });

      it('accepts css',function(){
        var extension = 'css';
        assertExtensions(extension, extension, [extension]);
      });

      it('defaults to scss',function(){
        var extension = 'scss';
        assertExtensions(null, extension, [extension]);
      });

    });

    describe('logging', function() {
      var fakeConsole;

      beforeEach(function(){
        fakeConsole = { log:function(){}};
        chai.spy.on(fakeConsole, 'log');
      });

      it('should log when log=true', co.wrap(function *() {
        yield buildAndLint('tests/fixtures/has-errors', {disableConsoleLogging:false, console: fakeConsole});
        expect(fakeConsole.log).to.have.been.called();
      }));

      it('should not log when log=false', co.wrap(function *() {
        yield buildAndLint('tests/fixtures/has-errors', {log: false,console: fakeConsole});
        expect(fakeConsole.log).to.not.have.been.called();
      }));
    });

    describe('StyleLint Configuration', function(){

      it('doesn\'t mutate options', function() {
        function generateTest() { return 'OK!'; }
        var options = {disableTestGeneration:true, testGenerator: generateTest};
        new StyleLinter('', options);
        expect(options.testGenerator, 'options.testGenerator is intact').to.equal(generateTest);
        expect(options.disableTestGeneration, 'options.disableTestGeneration is intact').to.be.true;
      });

      it('cant set files option', function(){
        var options = {linterConfig:{files:['a','b']}};
        var tree = new StyleLinter('', options);
        expect(tree.linterConfig.files).to.be.null;

      });

    });

    it('sets options on object', function(){
      var linterConfig = {syntax:'scss'};
      var options = {linterConfig:linterConfig, disableTestGeneration:true};
      var linter = new StyleLinter('', options);
      expect(linter.disableTestGeneration).to.equal(true);
      expect(linter.linterConfig).to.eql(linterConfig);
    });

    it('accepts a custom logger', co.wrap(function *() {
      var spy = chai.spy();
      yield buildAndLint('tests/fixtures/test-generation', {linterConfig:{syntax:'scss'}, log:true, consoleLogger:spy});
      expect(spy).to.have.been.called();
    }));

    describe('Tests', function () {

      describe('Generate Tests', function(){
        it('accepted testGenerator property', co.wrap(function *() {
          var opt = {
            testGenerator:function(){
              return 'custom test';
            }
          };
          var test = 'custom test';

          let results = yield buildAndLint('tests/fixtures/no-errors', opt);
          let testPaths = walkTestsOutputReadableTree(results);
          expect(readTestFile(testPaths)).to.equal(test);
        }));

        it('generates no tests regardless of other test config when disableTestGeneration is true', co.wrap(function *() {
          let results = yield buildAndLint('tests/fixtures/test-generation', {disableTestGeneration:true});
          let result = walkTestsOutputTree(results);
          expect(result.length).to.equal(0);
        }));
      });

      let buildAndAssertFile = co.wrap(function *(options, relativePath, equal) {
        let results = yield buildAndLint('tests/fixtures/test-generation', options);

        let path = results.directory + '/' + relativePath;
        let content = fs.readFileSync(path).toString();

        if (equal) {
          expect(content).to.equal('');
        } else {
          expect(content).to.not.equal('');
        }
      });

      describe('Property testPassingFiles', function(){
       it('doesnt generate tests for failing files', function(){
         return buildAndAssertFile({testPassingFiles: true}, 'nested-dir/has-errors2.stylelint-test.js', true);
       });

       it('generates tests for passing files', function(){
         return buildAndAssertFile({testPassingFiles: true}, 'nested-dir/no-errors.stylelint-test.js', false);
       });
      });

      describe('Property testFailingFiles', function(){
       it('doesnt generate tests for passing files', function(){
         return buildAndAssertFile({testFailingFiles: true}, 'nested-dir/has-errors2.stylelint-test.js', false);
       });

       it('generates tests for failing files', function(){
         return buildAndAssertFile({testFailingFiles: true}, 'nested-dir/no-errors.stylelint-test.js', true);
       });
      });
    });
  });

  describe('Generated Tests', function(){

    it('correctly handles nested folders', co.wrap(function *() {
      let results = yield buildAndLint('tests/fixtures/test-generation', {testFailingFiles:true});
      return expect(walkTestsOutputTree(results)).to.eql([
        'has-errors.stylelint-test.js',
        'nested-dir/has-errors2.stylelint-test.js',
        'nested-dir/no-errors.stylelint-test.js',
      ]);
    }));

    it('generates correct failing test string', co.wrap(function *() {
      var testAssertion = 'module(\'Style Lint\');\n'+
                          'test(\'has-errors.scss should pass stylelint\', function() {\n'+
                          '  ok(false, \'1:15 Unexpected empty block (block-no-empty)\');\n'+
                          '  ok(false, \'6:10 Expected \\"#000000\\" to be \\"black\\" (color-named)\');\n'+
                          '});\n';

      let results = yield buildAndLint('tests/fixtures/has-errors', {testFailingFiles:true});
      return expect(readTestFile(walkTestsOutputReadableTree(results))).to.equal(testAssertion);
    }));

    it('generates correct passing test string', co.wrap(function *() {
      var passedTestAssertion = 'module(\'Style Lint\');\n'+
                                'test(\'no-errors.scss should pass stylelint\', function() {\n'+
                                '  ok(\'true , no-errors.scss passed stylelint\');\n'+
                                '});\n';

      let results = yield buildAndLint('tests/fixtures/no-errors', {testPassingFiles:true});
      return expect(readTestFile(walkTestsOutputReadableTree(results))).to.equal(passedTestAssertion);
    }));
  });
});

function readTestFile(testPaths){
  var test = fs.readFileSync(testPaths.basePath+'/'+testPaths.tree[0]);
  return String(test).toString();
}
function walkTestsOutputTree(results){
    var outputPath = results.directory;
    results = walkSync(outputPath, ['**/*.js']);
    return results;
}

function walkTestsOutputReadableTree(results){
    return {basePath:results.directory, tree:walkTestsOutputTree(results)};
}

function buildAndLint(sourcePath, options) {
  var defaultOptions = {log:false, linterConfig:{syntax:'scss', formatter: 'string'}};
  if(options){
    options = merge(defaultOptions,options);
  } else {
    options = defaultOptions;
  }
  options.onError = function(results) {
    lintErrors.push(results);
  };

  var tree = new StyleLinter(sourcePath, options);
  builder = new broccoli.Builder(tree);

  return builder.build();
}
