'use strict';

const testGenerators   = require('aot-test-generators');
const escapeString     = require('js-string-escape');

module.exports = function(relativePath, errors, testingFramework){
  let generator = testGenerators[testingFramework];
  let passed = !errors;
  let assertions = null;
  if(!passed){
    assertions = errors.warnings.map(warning => `${warning.line}:${warning.column} ${escapeString(warning.text)}`).join('\n');
  }

  return (
    generator.suiteHeader('Stylelint') +
    generator.test(relativePath + ' should pass stylelint', passed, assertions) +
    generator.suiteFooter()
  );
};
