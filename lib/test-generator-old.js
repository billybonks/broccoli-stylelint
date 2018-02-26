const escapeString     = require('js-string-escape');

module.exports = function(relativePath, errors) {
  let assertions = [];
  let module  = 'module(\'Style Lint\');\n';
  let test = 'test(\'' + relativePath + ' should pass stylelint\', function() {\n';
  if(!errors){
    let assertion =  '  ok(\'true , '+relativePath+' passed stylelint\');';
    return module+test+assertion+'\n});\n';
  } else {
    for(let i = 0; i < errors.warnings.length; i++){
      let warning = errors.warnings[i];
      let index = warning.line+':'+warning.column;
      assertions.push('  ok(' + false + ', \''+index +' '+escapeString(warning.text)+'\');');
    }
    return module+test+assertions.join('\n')+'\n});\n';
  }
};
