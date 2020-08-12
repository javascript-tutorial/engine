let limax = require("limax");
let lang = require('config').lang;

module.exports = function transliterate(str) {
  return limax(str, {tone: false, lang});
};
