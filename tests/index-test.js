'use strict';

const BroccoliStylelint = require('../index');

describe('broccoli-stylelint', () => {
  describe('constructors', () => {
    describe('#create', () => {
      test('It returns a broccoli-styleliny instance', () => {
        let linter = BroccoliStylelint.create('', {});
        expect(linter.constructor).toEqual(BroccoliStylelint);
      });
    });
  });
});
