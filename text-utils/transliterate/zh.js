let limax = require("limax");

module.exports = function transliterate(str) {
  return limax(str, {tone: false, lang:'zh'});
};
