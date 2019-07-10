const assert = require('assert');

assert(typeof IS_CLIENT === 'undefined');

const path = require('path');
const getPrismLanguage = require('../../getPrismLanguage');
const log = require('engine/log')();
const t = require('engine/i18n');

const pug = require('engine/server-pug');

module.exports = function(md) {

  md.renderer.rules.blocktag_codetabs = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];

    if (options.ebookType) {
      let plunkUrl = `https://plnkr.co/edit/${token.plunk.plunkId}?p=preview`;
      return `<p><a target="_blank" href="${plunkUrl}">${plunkUrl}</a></p>`;
    }

    let files = token.plunk.files;

    // console.log("FILES");
    // console.log(JSON.stringify(files, (key, value) => (key === 'content' ? value.trim().slice(0, 10) : value), 4));

    let tabs = [];

    let hasServerJs = false;

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      let ext = path.extname(file.filename).slice(1);

      let prismLanguage = getPrismLanguage(ext);

      let languageClass = 'language-' + prismLanguage + ' line-numbers';

      tabs.push({
        title:   file.filename,
        class:   languageClass,
        content: file.content
      });

      if (file.filename === 'server.js') {
        hasServerJs = true;
      }
    }

    let height = +token.blockTagAttrs.height || 200;

    if (!options.html) {
      height = Math.min(height, 800);
    }


    let locals = {
      tabs,
      height,
      src:    path.join(options.resourceWebRoot, token.blockTagAttrs.src) + '/'
    };

    if (hasServerJs) {
      locals.zip = {
        href: '/tutorial/zipview/' + path.basename(locals.src) + '.zip?plunkId=' + token.plunk.plunkId
      };
    } else {
      locals.edit = {
        href:    'https://plnkr.co/edit/' + token.plunk.plunkId + '?p=preview',
        plunkId: token.plunk.plunkId
      };
    }

    locals.external = {
      href: locals.src
    };

    locals.current = token.blockTagAttrs.current;

    locals.t = t;

    return pug.serverRenderFile(path.join(__dirname, '../../templates/codeTabs.pug'), locals);
  };
};

