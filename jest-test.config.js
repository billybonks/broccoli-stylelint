module.exports = {
  displayName: 'test',
  testRegex: '.*(.test.js)',
  watchPathIgnorePatterns: ['<rootDir>/tmp'],
  testPathIgnorePatterns: ['tmp', 'node_modules', '/__snapshots__/'],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov']
};
