const SUPPORTED_FILE_FORMATS = ['sss','scss','sass','css','less','html','js','md'];

/**
 * returns file extension based on syntax if null returns all supported formats.
 * @param {string} syntax sass|css|less|sugarss
 */

module.exports = function(syntax) {
  if(syntax) {
    let extensions = [];
    let targetExtension;
    if(syntax === 'sugarss') {
      targetExtension = 'sss';
    } else {
      targetExtension = syntax;
    }
    extensions.push(targetExtension);
    return extensions;
  } else {
    return SUPPORTED_FILE_FORMATS;
  }
};
