'use strict';

const t = require('engine/i18n');

t.requirePhrase('engine/markit', 'demo');

module.exports = function(md) {

  md.renderer.rules.blocktag_demo = function(tokens, idx, options, env, slf) {

    let src = tokens[idx].blockTagAttrs.src;

    // need <p>, so that next inline-block [solution] button doesn't stick
    if (src) {
      let href = (src[0] == '/') ? src : (options.staticHost + options.resourceWebRoot + '/' + src);
      href += '/';

      return `<p><a href="${href}" target="blank">${t('markit.demo.window')}</a></p>`;
    }

    return `<p><a href="#" onclick="event.preventDefault(); runDemo(this)">${t('markit.demo.run')}</a></p>`;

  };

};
