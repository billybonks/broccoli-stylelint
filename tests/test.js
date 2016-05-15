var StyleLinter = require('..');
var broccoli = require('broccoli');
var chai = require('chai');
var fs = require('fs');

var assert = chai.assert;
var expect = chai.expect;

describe('Broccoli build', function() {

  beforeEach(function() {
    errors = [];
  });

  afterEach(function() {
    if (builder) {
      builder.cleanup();
    }
  });

  it('catches errors', function() {
    return buildAndLint('tests/fixtures/has-errors').then(function(results) {
      assert.equal(errors.length,1)
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
});


function buildAndLint(sourcePath, options) {
 var options = options || {linterConfig:{syntax:'sass'}};
  options.linterConfig.formatter = function(fileLint) {
    errors.push(fileLint)
  };

  var tree = new StyleLinter(sourcePath, options);
  builder = new broccoli.Builder(tree);

  return builder.build();
}
