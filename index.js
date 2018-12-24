const BroccoliStyleLint = require('./src/broccoli-stylelint');
const TestGeneratorFactory = require('./src/test-generator-factory');
const concat = require('broccoli-concat');

module.exports = {
  create (inputNode, options) {
    let testGenerators;
    if(!options.testGenerators){
       testGenerators = TestGeneratorFactory.create(options.testingFramework || 'qunit');
    } else {
      testGenerators = options.testGenerators;
      delete options.testGenerators;
    }
    if (!options.group) {
      options.testGenerator = testGenerators.suite;
      return new BroccoliStyleLint(inputNode, options);
    } else {
      options.testGenerator = testGenerators.test;
      let resultTree = new BroccoliStyleLint(inputNode, options);
      let header = testGenerators.suiteHeader('Stylelint');
      let footer = testGenerators.suiteFooter();

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
