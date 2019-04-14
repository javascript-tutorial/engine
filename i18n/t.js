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
    err("No such phrase", phrase);
  }

  return i18n.t(LANG, ...arguments);
}

module.exports = t;

const LANG = require('config').lang;

if (LANG !== 'en') {
  i18n.setFallback(LANG, 'en');
}

i18n.add = (...args) => i18n.addPhrase(LANG, ...args);

t.i18n = i18n;

