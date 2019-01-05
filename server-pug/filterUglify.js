let filters = require('pug').filters;

let UglifyJS = require("uglify-es");

filters.uglify = function(str) {
  let result = UglifyJS.minify(str);
  if (result.error) {
    throw result.error;
  }
  return result.code;
};

