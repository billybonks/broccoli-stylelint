'use strict';
const TestGeneratorFactory = require(`../src/test-generator-factory`);
const frameworks = ['qunit', 'mocha'];
const generators = ['suite', 'test'];
const errors = require('./fixtures/errors');
const noErrors = require('./fixtures/no-errors');

generators.forEach(function(type){
  describe(type, function() {
    frameworks.forEach(function(framework){
      describe(framework, function() {
        let testGenerator = null;
        beforeEach(function() {
          testGenerator = TestGeneratorFactory.create(framework);
        });
        it('generates correct errored test', function(){
          let results = testGenerator[type]('has-errors.scss', errors);
          expect(results).toMatchSnapshot();
        });
        it('generates correct passed test', function(){
          let results = testGenerator[type]('no-errors.scss', noErrors);
          expect(results).toMatchSnapshot();
        });
      });
    });
  });
});
