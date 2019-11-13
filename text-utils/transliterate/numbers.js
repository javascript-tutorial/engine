  /*
// kurishiro is async =((( unusable in md plugins =((
// all other modules don't translate kanji
// 私は ひらがな が大好き - OK
// 変数 - no
// 文字列比較 - no

let Kuroshiro = require("kuroshiro");
let KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

let kuroshiro = new Kuroshiro();
let analyzer = new KuromojiAnalyzer();
kuroshiro.init(analyzer);
 */
let counter = 1;

module.exports = function transliterate(str) {
  return 'ref-'+counter++;
};
