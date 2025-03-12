'use strict';

const BabelFish = require('babelfish');

const i18n = new BabelFish('en');

let err = console.error;


if (typeof IS_CLIENT === 'undefined') {
  const log = require('engine/log')();
  err = (...args) => log.error(...args);
}

function t(phrase) {

  if (!i18n.hasPhrase(LANG, phrase)) {
    // log only in server environment && development
    // client isn't logging this kind of errors now, comment out to log everywhere
    let shouldLog = typeof IS_CLIENT === 'undefined' && (process.env.I18N_DEBUG || process.env.NODE_ENV === 'development');
    if (shouldLog) {
      err("No such phrase", phrase);
    }
  }

  return i18n.t(LANG, ...arguments);
}

module.exports = t;

const LANG = require('config').lang;

if (LANG !== 'en') {
  i18n.setFallback(LANG, 'en');
}

i18n.add = (...args) => {
  args = args.map(arg => arg.__esModule ? arg.default : arg);
  return i18n.addPhrase(LANG, ...args);
};

t.i18n = i18n;
