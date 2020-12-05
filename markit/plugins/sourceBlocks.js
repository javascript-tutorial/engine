'use strict';

/**
 * Client/server plugin
 * Rewrites fenced blocks to blocktag_source
 * adds the renderer for it
 */

const parseAttrs = require('../utils/parseAttrs');
const stripIndents = require('engine/text-utils/stripIndents');
const extractHighlight = require('../utils/source/extractHighlight');
const tokenUtils = require('../utils/token');

const t = require('engine/i18n/t');
const getPrismLanguage = require('../getPrismLanguage');

const config = require('config');

require('engine/prism/core');

t.i18n.add('markit.code', require('../locales/code/' + config.lang + '.yml'));


function rewriteFenceToSource(state) {

  for (let idx = 0; idx < state.tokens.length; idx++) {

    if (state.tokens[idx].type == 'fence') {
      let attrs = parseAttrs(state.tokens[idx].info, true);

      let langOrExt = attrs.blockName || '';

      if (!getPrismLanguage.allSupported.includes(langOrExt)) continue;

      state.tokens[idx].type = 'blocktag_source';
      state.tokens[idx].blockTagAttrs = attrs;
    }
  }

}

module.exports = function(md) {

  md.core.ruler.push('rewrite_fence_to_source', rewriteFenceToSource);

  md.renderer.rules.blocktag_source = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];

    let attrs = token.blockTagAttrs;

    let lang = attrs.blockName;

    let prismLanguage = getPrismLanguage(lang);

    let blockTagId = Math.random().toString(36).slice(2, 12);

    token.attrPush(['id', blockTagId]);

    token.attrPush(['data-trusted', (options.html && !attrs.untrusted) ? 1 : 0]);

    if (attrs.global) {
      token.attrPush(['data-global', 1]);
    }

    token.attrPush(['class', 'code-example']);

    if (attrs['no-strict']) {
      token.attrPush(['data-no-strict', 1]);
    }

    let height;

    if (+attrs.height || attrs.height === "0") {
      height = +attrs.height;
      if (!options.html) height = Math.max(height, 800);
      token.attrPush(['data-demo-height', height]);
    }

    if (attrs.refresh) {
      token.attrPush(['data-refresh', '1']);
    }

    if (attrs.async) {
      token.attrPush(['data-async', '1']);
    }

    if (options.html && attrs.demo) {
      token.attrPush(['data-demo', '1']);
    }

    // strip first empty lines
    let content = stripIndents(token.content);

    let highlight = extractHighlight(content);

    if (highlight.highlight.length) {
      token.attrPush(['data-highlight', JSON.stringify(highlight.highlight)]);
    }

    content = highlight.text;

    /*
    if (!global.maxLen) global.maxLen = 0;

    let maxLen = Math.max(...content.split("\n").map(s => s.length));
    if (global.maxLen < maxLen) {
      global.maxLen = maxLen;
      console.log(maxLen);
      console.log("MAXLEN", content);
    }
    */

    let toolbarHtml = '';
    if (attrs.run && !options.ebookType) {
      toolbarHtml = `
        <div class="toolbar codebox__toolbar">
          <div class="toolbar__tool">
            <a href="#" title="${t(lang === 'js' ? 'markit.code.run' : 'markit.code.show')}" data-action="run" class="toolbar__button toolbar__button_run"></a>
          </div>
          <div class="toolbar__tool">
            <a href="#" title="${t('markit.code.open.sandbox')}" target="_blank" data-action="edit" class="toolbar__button toolbar__button_edit"></a>
          </div>
        </div>`;
    }

    if (options.html && attrs.autorun) {
      // autorun may have "no-epub" value meaning that it shouldn't run on epub (code not supported)
      token.attrPush(['data-autorun', attrs.autorun]);
    }


    let codeResultHtml = '';

    //- iframe must be in HTML with the right height
    //- otherwise page sizes will be wrong and autorun leads to resizes/jumps
    if (attrs.autorun && options.html && lang === 'html') {
      if (options.ebookType === 'epub' && typeof IS_CLIENT === 'undefined') {
        tokenUtils.attrDel(token, 'data-autorun');

        let fs = require('fs-extra');

        fs.ensureDirSync(config.publicRoot + '/autorun');
        fs.writeFileSync(config.publicRoot + '/autorun/' + blockTagId + '.html', content);
        //- iframes with about:html are saved to disk incorrectly by FF (1 iframe content for all)
        //- @see https://bugzilla.mozilla.org/show_bug.cgi?id=1154167
        codeResultHtml = `<div class="code-result code-example__result">
          <iframe
            class="code-result__iframe"
            name="${blockTagId}"
            style="height:${height || 200}px"
            src="/autorun/${blockTagId}.html"></iframe>
        </div>`;

      } else {
        //- iframes with about:html are saved to disk incorrectly by FF (1 iframe content for all)
        //- @see https://bugzilla.mozilla.org/show_bug.cgi?id=1154167
        codeResultHtml = `<div class="code-result code-example__result">
          <iframe
            class="code-result__iframe"
            name="test-${blockTagId}"
            style="height:${height || 200}px"
            src="${options.ebookType == 'epub' ? ("/ebook/blank.html?" + Math.random()) : 'about:blank'}"></iframe>
        </div>`;
      }
    }

    content = md.utils.escapeHtml(content);

    if (process.env.TUTORIAL_EDIT) {
      // for examples to work locally
      content = content.replace(/https?:\/\/(\w+\.)*javascript.info/g, 'http://$1javascript.local:' + config.server.port);
      content = content.replace(/wss?:\/\/(\w+\.)*javascript.info/g, 'ws://$1javascript.local:' + config.server.port);
    }

    return `<div${slf.renderAttrs(token)}>
      <div class="codebox code-example__codebox">
        ${toolbarHtml}
        <div class="codebox__code" data-code="1">
          <pre class="line-numbers language-${prismLanguage}"><code>${content}</code></pre>
        </div>
      </div>
      ${codeResultHtml}
      </div>`;

  };

};
