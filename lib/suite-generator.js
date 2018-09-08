'use strict';

const testGenerators   = require('aot-test-generators');
const testGenerator    = require('./test-generator');
module.exports = function(relativePath, results, testingFramework){
  let generator = testGenerators[testingFramework];
  return (
    generator.suiteHeader(`Stylelint`) +
    testGenerator(relativePath, results, testingFramework) +
    generator.suiteFooter()
  );
};
