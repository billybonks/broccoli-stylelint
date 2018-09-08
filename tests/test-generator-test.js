'use strict';
const frameworks = ['qunit', 'mocha'];
const generators = ['test-generator', 'suite-generator'];

const errors = require('./fixtures/errors');
const noErrors = require('./fixtures/no-errors');

generators.forEach(function(generator){
  describe(generator, function() {
    let _generator = require(`../lib/${generator}`);
    describe('errors is defined', function() {
      frameworks.forEach(function(framework){
        describe(framework, function() {
          it('generates correct errored test', function(){
            let results = _generator('has-errors.scss', errors, framework);
            expect(results).toMatchSnapshot();
          });
          it('generates correct passed test', function(){
            let results = _generator('no-errors.scss', noErrors, framework);
            expect(results).toMatchSnapshot();
          });
        });
      });
    });
  });
});
