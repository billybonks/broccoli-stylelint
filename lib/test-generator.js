'use strict';

const testGenerators   = require('aot-test-generators');
const escapeString     = require('js-string-escape');

module.exports = function(relativePath, results, testingFramework){
  let generator = testGenerators[testingFramework];
  let passed = !results.errored;
  let assertions = null;
  if(!passed){
    assertions = results.warnings.map(warning => `${warning.line}:${warning.column} ${escapeString(warning.text)}`).join('\n');
  }
  return generator.test(relativePath + ' should pass stylelint', passed, assertions);
};
