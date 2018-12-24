const BroccoliStyleLint = require('./src/broccoli-stylelint');
const concat = require('broccoli-concat');

module.exports = {
  create (inputNode, options) {
    if (!options.group) {
      return new BroccoliStyleLint(inputNode, options);
    } else {
      options.testGenerator = require('./src/test-generator');
      let resultTree = new BroccoliStyleLint(inputNode, options);

      const testGenerators   = require('aot-test-generators');
      let testGenerator = testGenerators[resultTree.internalOptions.testingFramework];
      let header = testGenerator.suiteHeader('Stylelint');
      let footer = testGenerator.suiteFooter();

      return concat(resultTree, {
        outputFile: `/${options.group}.stylelint-test.js`,
        header,
        inputFiles: ['**/*.stylelint-test.js'],
        footer,
        sourceMapConfig: { enabled: false },
        allowNone: true,
      });
    }
  }
};
