module.exports = {
  "extends": "google",
  parserOptions: {
    "sourceType": "module"
  },
  rules: {
    "no-var": 0,
    "max-len": [2, {
      code: 100,
      tabWidth: 2,
      ignoreUrls: true,
      ignorePattern: '^goog\.(module|require)',
    }],
  }
};
