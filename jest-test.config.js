module.exports = {
  displayName: 'test',
  testRegex: '.*(test.js)',
  watchPathIgnorePatterns: ['<rootDir>/tmp'],
  testPathIgnorePatterns: ['tmp', 'node_modules'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov']
};
