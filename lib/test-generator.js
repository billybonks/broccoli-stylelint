const testGenerators   = require('aot-test-generators');

module.exports = function(errors, testingFramework){
  let generator = testGenerators[testingFramework];
  let passed = !errors;
  let assertions = null;
  if(!passed){
    assertions = errors.warnings.map(warning => `${warning.line}:${warning.column} ${this.escapeErrorString(warning.text)}`).join('\n');
  }

  return (
    generator.suiteHeader('Stylelint') +
    generator.test(relativePath + ' should pass stylelint', passed, assertions) +
    generator.suiteFooter()
  );
}


// QUnit.module('Stylelint');
// QUnit.test('has-errors.scss should pass stylelint', function(assert) {
//   assert.expect(1);
//   assert.ok(false, '1:15 Unexpected empty block (block-no-empty)\\n6:10 Expected \\\\\"#000000\\\\\" to be \\\\\"black\\\\\" (color-named)');
// });
//


// QUnit.module('Stylelint');
// QUnit.test('no-errors.scss should pass stylelint', function(assert) {
//   assert.expect(1);
//   assert.ok(true, 'no-errors.scss should pass stylelint');
// });
