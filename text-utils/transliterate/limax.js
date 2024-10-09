let { slug } = require("limax");
let lang = require('config').lang;

module.exports = function transliterate(str) {
  return slug(str, {tone: false, lang});
};
