const testGenerators   = require('aot-test-generators');
const escapeString     = require('js-string-escape');

let suiteGenerator = function(relativePath, results){
  return (
    this.aotGenerator.suiteHeader(`Stylelint`) +
    this.testGenerator(relativePath, results) +
    this.aotGenerator.suiteFooter()
  );
};

let testGenerator = function(relativePath, results){
  let passed = !results.errored;
  let assertions = null;
  if(!passed){
    assertions = results.warnings.map(warning => `${warning.line}:${warning.column} ${escapeString(warning.text)}`).join('\n');
  }
  return this.aotGenerator.test(relativePath + ' should pass stylelint', passed, assertions);
};

module.exports = {
  create(framework) {
     let generator = testGenerators[framework];
     let boundTestGenerator = testGenerator.bind({
       aotGenerator: generator,
     });
     let boundSuiteGenerator = suiteGenerator.bind({
       aotGenerator: generator,
       testGenerator: boundTestGenerator
     });
     return {
       suiteHeader: generator.suiteHeader,
       suiteFooter: generator.suiteFooter,
       suite: boundSuiteGenerator,
       test: boundTestGenerator,
     };
  }
};
