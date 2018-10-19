let transliterate = require('./transliterate');

module.exports = function(title) {
  let anchor = title.trim()
    .replace(/<\/?[a-z].*?>/gim, '')  // strip tags, leave /<DIGIT/ like: "IE<123"
    .replace(/[ \t\n!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g, '-') // пунктуация, пробелы -> дефис
    .replace(/-+/gi, '-') // слить дефисы вместе
    .replace(/^-|-$/g, ''); // убрать дефисы с концов

  anchor = transliterate(anchor);

  anchor = anchor.toLowerCase();
  anchor = anchor.replace(/[^a-z0-9-]/gi, ''); // убрать любые символы, кроме [слов цифр дефиса])

  return anchor;
};

