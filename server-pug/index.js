const fs = require('fs');
const path = require('path');
const config = require('config');
const pug = require('pug');
const pugResolve = require('./resolve');


module.exports = pug;

pug.pugResolve = pugResolve;

pug.pugConfig = Object.assign({}, config.pug, {
  pretty:       false,
  compileDebug: false,
  plugins:      [{
    resolve: pugResolve
  }]
});

pug.serverRenderFile = function(file, options) {
  return pug.renderFile(file, Object.assign({}, pug.pugConfig, options));
};

/**
 * extension for require('file.pug'),
 * works in libs that are shared between client & server
 */
require.extensions['.pug'] = function (module, filename) {

  let compiled = pug.compile(
    fs.readFileSync(filename, 'utf-8'),
    Object.assign({}, pug.pugConfig, {filename})
  );

  module.exports = function (locals) {
    locals = locals || {};

    return compiled(locals);
  };

//  console.log("---------------> HERE", fs.readFileSync(filename, 'utf-8'), module.exports);

};


// put to the bottom because of the require loop
// nested module needs populated pug
require('./filterMarkit');

require('./filterUglify');

