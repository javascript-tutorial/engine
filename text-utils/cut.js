const t = require('engine/i18n/t');

const LANG = require('config').lang;

t.i18n.add('cut', require('./locales/cut/' + LANG + '.yml'));

const trimHtml = require('trim-html');

module.exports = function (text, options, parseCallback) {
  if (!options) return parseCallback(text);

  let {mode = 'cut', length: maxCutLength = 600} = options;

  let CUT_REGEX = /(^|\n)\[cut\](\n|$)/i;

  let cutTagPos = text.search(CUT_REGEX);
  let isValidCutPos = cutTagPos >= 0 && cutTagPos <= maxCutLength;

  if (mode === "cut") {
    // only leave text before cut

    if (isValidCutPos) {
      // valid cut => cut before HTML processing
      text = trimHtml(text, {limit: cutTagPos}).html;
      return parseCallback(text);
    } else {
      // invalid cut => cut after HTML processing
      text = parseCallback(text);

      text = trimHtml(text, {limit: maxCutLength}).html;

      return text;
    }

  } else if (mode === 'full-preview') {
    text = text.replace(CUT_REGEX, isValidCutPos ? '\n' : '\n' + t('cut.cut_too_low') + '\n');
    return parseCallback(text);
  } else if (mode === 'full') {
    // in full mode even invalid cut is removed
    // (we don't need it, it dirties the output anyway)
    text = text.replace(CUT_REGEX, '\n');
    return parseCallback(text);
  }
};

