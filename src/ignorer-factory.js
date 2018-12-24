const path  = require('path');
//Copied from stylelint, until style lint ignores files properly via node api
module.exports = {
  create() {
    let ignore = require('ignore');
    let fs = require('fs');
    let DEFAULT_IGNORE_FILENAME = '.stylelintignore';
    let FILE_NOT_FOUND_ERROR_CODE = 'ENOENT';
    // The ignorer will be used to filter file paths after the glob is checked,
    // before any files are actually read
    let ignoreFilePath = DEFAULT_IGNORE_FILENAME;
    let absoluteIgnoreFilePath = path.isAbsolute(ignoreFilePath)
      ? ignoreFilePath
      : path.resolve(process.cwd(), ignoreFilePath);
    let ignoreText = '';
    try {
      ignoreText = fs.readFileSync(absoluteIgnoreFilePath, 'utf8');
    } catch (readError) {
      if (readError.code !== FILE_NOT_FOUND_ERROR_CODE) {
        throw readError;
      }
    }
    return ignore()
      .add(ignoreText);
  }
};
