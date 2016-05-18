var StyleLinter = require('..');
var broccoli = require('broccoli');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var walkSync = require('walk-sync');

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
    it('uses plugins');
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

      it('cant override formatter', function(){
        var options = {linterConfig:{formatter:'verbose'}};
        var tree = new StyleLinter('', options);
        assert.equal(tree.linterConfig.formatter, 'string');
      });

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

      it('doesnt generateTests when option is false', function() {
        return expect(buildAndLint('tests/fixtures/test-generation')
                              .then(walkTestsOutputTree)
                              .then(function(result){return result.length;})
              ).to.eventually.equal(0);
      });
    });

  });

  describe('Generated Tests', function(){
    var generateTestsConfig;

    beforeEach(function() {
      generateTestsConfig  = {disableConsoleLogging:true, generateTests:true, linterConfig:{syntax:'sass', formatter: 'string'}};
    });

    it('correctly handles nested folders', function() {
      return expect(buildAndLint('tests/fixtures/test-generation', generateTestsConfig)
                              .then(walkTestsOutputTree))
             .to.eventually.eql([ 'tests/has-errors.scss.test.js', 'tests/has-errors2.scss.test.js' ]);
    });

    it('doesnt generate tests when no there is no error', function() {
      return expect(buildAndLint('tests/fixtures/no-errors', generateTestsConfig)
                            .then(walkTestsOutputTree)
                            .then(function(result){return result.length;})
             ).to.eventually.equal(0);
    });

    it('generates correct qunit test string');
  });
});

function walkTestsOutputTree(results){
    var outputPath = results.directory;
    results = walkSync(outputPath, ['tests/*.js']);
    return results;
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
