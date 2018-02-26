/* eslint-disable no-useless-escape*/
let outputs ={
  qunit: {
    errored:
`QUnit.module('Stylelint');
QUnit.test('has-errors.scss should pass stylelint', function(assert) {
  assert.expect(1);
  assert.ok(false, '1:15 Unexpected empty block (block-no-empty)\\n6:10 Expected \\\\\"#000000\\\\\" to be \\\\\"black\\\\\" (color-named)');
});
`,
  passed:
`QUnit.module('Stylelint');
QUnit.test('no-errors.scss should pass stylelint', function(assert) {
  assert.expect(1);
  assert.ok(true, 'no-errors.scss should pass stylelint');
});
`
},
  mocha: {
    errored:
`describe('Stylelint', function() {
  it('has-errors.scss should pass stylelint', function() {
    // test failed
    var error = new chai.AssertionError('1:15 Unexpected empty block (block-no-empty)\\n6:10 Expected \\\\\"#000000\\\\\" to be \\\\\"black\\\\\" (color-named)');
    error.stack = undefined;
    throw error;
  });
});
`,
    passed:
`describe('Stylelint', function() {
  it('no-errors.scss should pass stylelint', function() {
    // test passed
  });
});
`
  }
};

const frameworks = ['qunit', 'mocha'];
const generator = require('../lib/test-generator');
const errors = require('./fixtures/errors');

describe('test-generator', function() {
  describe('errors is defined', function() {
    frameworks.forEach(function(framework){
      describe(framework, function() {
        it('generates correct errored test', function(){
          let results = generator('has-errors.scss', errors, framework);
          expect(results).toEqual(outputs[framework].errored);
        });
        it('generates correct passed test', function(){
          let results = generator('no-errors.scss', null, framework);
          expect(results).toEqual(outputs[framework].passed);
        });
      });
    });
  });
});
