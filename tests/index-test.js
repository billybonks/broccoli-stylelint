'use strict';

const BroccoliStylelintFactory = require('../index');
const BroccoliStylelint = require('../src/broccoli-stylelint');
describe('broccoli-stylelint', () => {
  describe('constructors', () => {
    describe('#create', () => {
      test('It returns a broccoli-styleliny instance', () => {
        let linter = BroccoliStylelintFactory.create('', {});
        expect(linter.constructor).toEqual(BroccoliStylelint);
      });
    });
  });
});
