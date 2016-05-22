var StyleLinter = require('..');
var broccoli = require('broccoli');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var walkSync = require('walk-sync');
var fs = require('fs');

chai.use(chaiAsPromised);
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
        assert.equal(lintErrors[0].results[0].warnings.length,2);
      });
    });

    it('ignores file specified config');

    it('stylelint plugins work', function(){
      var opt = {disableConsoleLogging:true, linterConfig:{syntax:'sass', configFile:'tests/fixtures/.bemTestStylelintrc'}}
      return buildAndLint('tests/fixtures/test-plugin', opt).then(function(results){
        assert.equal(lintErrors[0].results[0].warnings.length,1);
      })
    });
  });

  describe('Configuration', function() {

    describe('Syntax', function(){

      function assertExtensions(syntax, targetExtension, extensions){
        var options = {linterConfig:{syntax:syntax}};
        builder = new StyleLinter('', options);
        expect(builder.targetExtension).to.equal(targetExtension);
        expect(builder.extensions).to.eql(extensions);
      }

      it('accepts less',function(){
        var extension = 'less';
        assertExtensions(extension, extension, [extension]);
      });

      it('accepts sass',function(){
        var extension = 'sass';
        assertExtensions(extension, extension, ['scss', extension]);
      });

      it('accepts scss',function(){
        var extension = 'scss';
        assertExtensions(extension, extension, ['sass', extension]);
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
        assertExtensions(null, extension, ['sass', extension]);
      });

    });

    describe('StyleLint Configuration', function(){

      it('cant set files option', function(){
        var options = {linterConfig:{files:['a','b']}};
        var tree = new StyleLinter('', options);
        assert.equal(tree.linterConfig.files, null);

      });

    });

    it('sets options on object', function(){
      var linterConfig = {syntax:'sass'};
      var options = {linterConfig:linterConfig, generateTests:true};
      var linter = new StyleLinter('', options);
      expect(linter.generateTests).to.equal(true);
      expect(linter.linterConfig).to.eql(linterConfig);
    });

    describe('Tests', function () {

      function generatorOptionsTest(testFileCount, options){
        return expect(buildAndLint('tests/fixtures/test-generation', options)
                              .then(walkTestsOutputTree)
                              .then(function(result){return result.length;})
              ).to.eventually.equal(testFileCount);
      }

      beforeEach(function() {
        generateTestsConfig  = {disableConsoleLogging:true, linterConfig:{syntax:'sass', formatter: 'string'}};
      });

      describe('Generate Tests', function(){
        it('generates all tests regardless of other test config when true', function() {
          generateTestsConfig.generateTests = true;
          generatorOptionsTest(3,generateTestsConfig)
        });

        it('generates no tests regardless of other test config when false', function() {
          generateTestsConfig.generateTests = false;
          generatorOptionsTest(3,generateTestsConfig)
        });
      })

      describe('Property testPassingFiles', function(){
        it('only tests passing files when true', function(){
          generateTestsConfig.testPassingFiles = true;
          return generatorOptionsTest(1,generateTestsConfig)
        })

        it('doesnt test passing files when false', function(){
          generateTestsConfig.testPassingFiles = false;
          generateTestsConfig.testFailingFiles = true;
          return generatorOptionsTest(2,generateTestsConfig)
        })
      })

      describe('Property testFailingFiles', function(){
        it('only tests passing files when true', function(){
          generateTestsConfig.testFailingFiles = true;
          return generatorOptionsTest(2,generateTestsConfig)
        })

        it('doesnt test passing files when false', function(){
          generateTestsConfig.testPassingFiles = true;
          generateTestsConfig.testFailingFiles = false;
          return generatorOptionsTest(1,generateTestsConfig)
        })
      })
    });

  });

  describe('Generated Tests', function(){
    var generateTestsConfig;

    beforeEach(function() {
      generateTestsConfig  = {disableConsoleLogging:true, linterConfig:{syntax:'sass', formatter: 'string'}};
    });

    it('correctly handles nested folders', function() {
      generateTestsConfig.testFailingFiles = true;
      return expect(buildAndLint('tests/fixtures/test-generation', generateTestsConfig)
                              .then(walkTestsOutputTree))
             .to.eventually.eql([ 'tests/has-errors.scss.test.js', 'tests/has-errors2.scss.test.js' ]);
    });

    it('generates correct failing test string', function(){
      var testAssertion = "module('Style Lint - .');\n"+
                          "test('has-errors.scss should pass style-lint', function() {\n"+
                          "  ok(false, '1:15 Unexpected empty block (block-no-empty)');\n"+
                          "  ok(false, '6:10 Expected \"#000000\" to be \"black\" (color-named)');\n"+
                          "});\n";
      generateTestsConfig.testFailingFiles = true;
      return expect(buildAndLint('tests/fixtures/has-errors', generateTestsConfig)
                                .then(walkTestsOutputReadableTree)
                                .then(readTestFile)
                   ).to.eventually.equal(testAssertion)
    });

    it('generates correct passing test string', function(){
      var passedTestAssertion = "module('Style Lint - .');\n"+
                          "test('no-errors.scss should pass style-lint', function() {\n"+
                          "  ok(true , no-errors.scss passed style-lint);\n"+
                          "});\n";
      generateTestsConfig.testPassingFiles = true;
      return expect(buildAndLint('tests/fixtures/no-errors', generateTestsConfig)
                                .then(walkTestsOutputReadableTree)
                                .then(readTestFile)
                   ).to.eventually.equal(passedTestAssertion)
    });
  });
});

function readTestFile(testPaths){
  var test = fs.readFileSync(testPaths.basePath+'/'+testPaths.tree[0])
  return new String(test).toString()
}
function walkTestsOutputTree(results){
    var outputPath = results.directory;
    results = walkSync(outputPath, ['tests/*.js']);
    return results;
}

function walkTestsOutputReadableTree(results){
    return {basePath:results.directory, tree:walkTestsOutputTree(results)};
}

function buildAndLint(sourcePath, options, onError) {
  options = options || {disableConsoleLogging:true, linterConfig:{syntax:'sass', formatter: 'string'}};
  options.onError = function(results) {
    lintErrors.push(results);
  };

  var tree = new StyleLinter(sourcePath, options);
  builder = new broccoli.Builder(tree);

  return builder.build();
}
