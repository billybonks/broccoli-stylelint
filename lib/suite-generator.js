'use strict';

const testGenerators   = require('aot-test-generators');
const escapeString     = require('js-string-escape');
const testGenerator    = require('./test-generator')
module.exports = function(relativePath, results, testingFramework){
  let generator = testGenerators[testingFramework];
  return (
    generator.suiteHeader(`Stylelint: ${relativePath}`) +
    testGenerator(relativePath, results, testingFramework) +
    generator.suiteFooter()
  );
};
