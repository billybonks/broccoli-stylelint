var chaiAsPromised = require("chai-as-promised");
var StyleLinter =    require('..');
var walkSync =       require('walk-sync');
var broccoli =       require('broccoli');
var chai =           require('chai');
var spies =          require('chai-spies');
var merge =          require('merge');
var fs =             require('fs');

chai.use(chaiAsPromised);
chai.use(spies);

var assert = chai.assert;
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
    it('catches errors', function() {
      return buildAndLint('tests/fixtures/has-errors').then(function(results) {
        assert.equal(lintErrors[0].warnings.length,2);
      });
    });

    it('ignores file specified config', function(){
      return buildAndLint('tests/fixtures/ignore').then(function(results) {
        assert.equal(lintErrors.length,0);
      });
    });

    it('stylelint plugins work', function(){
      return buildAndLint('tests/fixtures/test-plugin', {linterConfig:{syntax:'scss', configFile:'tests/fixtures/.bemTestStylelintrc'}}).then(function(results){
        assert.equal(lintErrors[0].warnings.length,1);
      });
    });

    it('returns usefull source name onError', function(){
      return buildAndLint('tests/fixtures/test-plugin', {linterConfig:{syntax:'scss', configFile:'tests/fixtures/.bemTestStylelintrc'}}).then(function(results){
        assert.equal(lintErrors[0].source,'has-error.scss');
      });
    });
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
        fakeConsole = { log:function(){}}
        chai.spy.on(fakeConsole, 'log');
      })

      it('should log when log=true', function(){
        return buildAndLint('tests/fixtures/has-errors', {disableConsoleLogging:false, console: fakeConsole}).then(function(results){
          expect(fakeConsole.log).to.have.been.called();
        });
      })

      it('should not log when log=false', function(){
        return buildAndLint('tests/fixtures/has-errors', {log: false,console: fakeConsole}).then(function(results){
          expect(fakeConsole.log).to.not.have.been.called();
        });
      })
    })

    describe('StyleLint Configuration', function(){

      it('cant set files option', function(){
        var options = {linterConfig:{files:['a','b']}};
        var tree = new StyleLinter('', options);
        assert.equal(tree.linterConfig.files, null);

      });

    });

    it('sets options on object', function(){
      var linterConfig = {syntax:'scss'};
      var options = {linterConfig:linterConfig, disableTestGeneration:true};
      var linter = new StyleLinter('', options);
      expect(linter.disableTestGeneration).to.equal(true);
      expect(linter.linterConfig).to.eql(linterConfig);
    });

    it('accepts a custom logger', function() {
      var spy = chai.spy();
      buildAndLint('tests/fixtures/test-generation', {linterConfig:{syntax:'scss'}, log:true, consoleLogger:spy}).then(
        function(){
          expect(spy).to.have.been.called();
        }
      )
    })

    describe('Tests', function () {

      function generatorOptionsTest(testFileCount, options){
        return expect(buildAndLint('tests/fixtures/test-generation', options)
                              .then(walkTestsOutputTree)
                              .then(function(result){return result.length;})
              ).to.eventually.equal(testFileCount);
      }

      describe('Generate Tests', function(){
        it('accepted testGenerator property', function() {
          var opt = {
            testGenerator:function(relativePath, errors){
              return "custom test"
            }
          }
          var test = "custom test"
          return expect(buildAndLint('tests/fixtures/no-errors', opt)
                                    .then(walkTestsOutputReadableTree)
                                    .then(readTestFile)
                       ).to.eventually.equal(test);
        })

        it('generates no tests regardless of other test config when disableTestGeneration is true', function() {
          generatorOptionsTest(3,{disableTestGeneration:true});
        });
      });
      function buildAndAssertFile(options, relativePath, equal) {
        var assertion = expect(buildAndLint('tests/fixtures/test-generation', options)
                .then(function(results) {
                  var path = results.directory+'/'+relativePath;
                  return fs.readFileSync(path).toString();
                })).to.eventually;
        return equal ? assertion.equal('') : assertion.not.equal('');
      }

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

    it('correctly handles nested folders', function() {
      return expect(buildAndLint('tests/fixtures/test-generation', {testFailingFiles:true})
                              .then(walkTestsOutputTree))
                              .to.eventually.eql([ 'has-errors.stylelint-test.js',
                                                   'nested-dir/has-errors2.stylelint-test.js',
                                                   'nested-dir/no-errors.stylelint-test.js' ]);
    });

    it('generates correct failing test string', function(){
      var testAssertion = "module('Style Lint');\n"+
                          "test('has-errors.scss should pass stylelint', function() {\n"+
                          "  ok(false, '1:15 Unexpected empty block (block-no-empty)');\n"+
                          "  ok(false, '6:10 Expected \\\"#000000\\\" to be \\\"black\\\" (color-named)');\n"+
                          "});\n";
      return expect(buildAndLint('tests/fixtures/has-errors', {testFailingFiles:true})
                                .then(walkTestsOutputReadableTree)
                                .then(readTestFile)
                   ).to.eventually.equal(testAssertion);
    });

    it('generates correct passing test string', function(){
      var passedTestAssertion = "module('Style Lint');\n"+
                          "test('no-errors.scss should pass stylelint', function() {\n"+
                          "  ok(\'true , no-errors.scss passed stylelint\');\n"+
                          "});\n";
      return expect(buildAndLint('tests/fixtures/no-errors', {testPassingFiles:true})
                                .then(walkTestsOutputReadableTree)
                                .then(readTestFile)
                   ).to.eventually.equal(passedTestAssertion);
    });
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

function buildAndLint(sourcePath, options, onError) {
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
