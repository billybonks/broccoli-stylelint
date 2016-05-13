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

  it('The linter should catch errors', function() {
    return buildAndLint('tests/fixtures/has-errors').then(function(results) {
      assert.equal(errors.length,1)
    });
  });
});


function buildAndLint(sourcePath, options) {
 var options = options || {linter:{}};
  options.linter.formatter = function(fileLint) {
    errors.push(fileLint)
  };

  var tree = new StyleLinter(sourcePath, options);
  builder = new broccoli.Builder(tree);

  return builder.build();
}
