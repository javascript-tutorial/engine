const parseAttrs = require('../../utils/parseAttrs');

const t = require('engine/i18n');

t.requirePhrase('engine/markit');

module.exports = function(md) {

  md.renderer.rules.blocktag_old = function(tokens, idx, options, env, slf) {

    let token = tokens[idx];

    return `<div class="important important_warn">
            <div class="important__header"><span class="important__type">${t('markit.old.title')}</span></div>
            <div class="important__content">
            ${t('markit.old.message')}
            </div></div>\n`;
  };

};
