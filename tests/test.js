var StyleLinter = require('..');
var broccoli = require('broccoli');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var fs = require('fs');
var walkSync = require('walk-sync');

chai.use(chaiAsPromised);
var assert = chai.assert;
var expect = chai.expect;

describe('Broccoli build', function() {

  beforeEach(function() {
    lintErrors = [];
  });

  afterEach(function() {
    if (builder) {
      builder.cleanup();
    }
  });

  it('catches errors', function() {
    return buildAndLint('tests/fixtures/has-errors').then(function(results) {
      assert.equal(lintErrors[0].results[0].warnings.length,2)
    });
  });
});

describe('Configuration', function() {
  describe('Syntax', function(){

    function assertExtensions(syntax, targetExtension, extensions){
      var options = {linterConfig:{syntax:syntax}};
      var linter = new StyleLinter('', options);
      expect(linter.targetExtension).to.equal(targetExtension);
      expect(linter.extensions).to.eql(extensions)
    }

    it('accepts less',function(){
      var extension = 'less'
      var linter = assertExtensions(extension, extension, [extension])
    })

    it('accepts sass',function(){
      var extension = 'sass'
      var linter = assertExtensions(extension, extension, ['scss', extension]);
    })

    it('accepts scss',function(){
      var extension = 'scss'
      var linter = assertExtensions(extension, extension, ['sass', extension]);
    })

    it('accepts sugarss',function(){
      var extension = 'sss'
      var linter = assertExtensions('sugarss', extension, [extension]);
    })

    it('accepts css',function(){
      var extension = 'css'
      var linter = assertExtensions(extension, extension, [extension])
    })

    it('defaults to css',function(){
      var extension = 'css'
      var linter = assertExtensions(null, extension, [extension])
    })

  })

  it('sets options on object', function(){
    var linterConfig = {syntax:'sass'}
    var options = {linterConfig:linterConfig, generateTests:true};
    var linter = new StyleLinter('', options);
    expect(linter.generateTests).to.equal(true);
    expect(linter.linterConfig).to.eql(linterConfig);
  })
});

describe('Generated Tests', function(){
  it('Correctly handles nested folders', function() {
    var options = {disableConsoleLogging:true, generateTests:true, linterConfig:{syntax:'sass', formatter: 'string'}};
    var treePromise = buildAndLint('tests/fixtures/test-generation',options)
    .then(function(results){
      var outputPath = results.directory;
      results = walkSync(outputPath, ['tests/*.js'])
      return results;
    })
    return assert.eventually.deepEqual(treePromise, [ 'tests/has-errors.scss.test.js', 'tests/has-errors2.scss.test.js' ])
  })

  it('doesnt generate tests when option set to false', function() {
    var treePromise = buildAndLint('tests/fixtures/test-generation')
    .then(function(results){
      var outputPath = results.directory;
      results = walkSync(outputPath, ['tests/*.js'])
      return results.length;
    })
    return assert.eventually.equal(treePromise,0)
  })
})

function buildAndLint(sourcePath, options) {
 var options = options || {disableConsoleLogging:true, linterConfig:{syntax:'sass', formatter: 'string'}};
  options.onError =function(results) {
    lintErrors.push(results)
  };

  var tree = new StyleLinter(sourcePath, options);
  builder = new broccoli.Builder(tree);

  return builder.build();
}
