'use strict';
const frameworks = ['qunit', 'mocha'];
const generator = require('../lib/test-generator');
const errors = require('./fixtures/errors');
const noErrors = require('./fixtures/no-errors');

describe('test-generator', function() {
  describe('errors is defined', function() {
    frameworks.forEach(function(framework){
      describe(framework, function() {
        it('generates correct errored test', function(){
          let results = generator('has-errors.scss', errors, framework);
          expect(results).toMatchSnapshot();
        });
        it('generates correct passed test', function(){
          let results = generator('no-errors.scss', noErrors, framework);
          expect(results).toMatchSnapshot();
        });
      });
    });
  });
});
