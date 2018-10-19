let lang = require('config').lang;

switch(lang) {
  case 'ru':
    module.exports = require('./ru');
    break;
  case 'en':
    module.exports = str => str;
    break;
  case 'ja':
    module.exports = require('./ja');
    break;
  case 'zh':
    module.exports = require('./zh');
    break;
  default:
    throw new Error("No transliteration module for language " + lang);
}
