/**
 * Loads info from external sources for
 * sandbox: links
 * codetabs
 * edit
 * iframe edit
 * [js src...] (for editing)
 *
 * @type {ok|exports|module.exports}
 */

const assert = require('assert');
const path = require('path');
const fs = require('mz/fs');
const t = require('engine/i18n');
const tokenUtils = require('./utils/token');

t.requirePhrase('engine/markit');


class SrcError extends Error {
}

function srcUnderRoot(root, src) {
  let absolutePath = path.join(root, src);

  if (absolutePath.slice(0, root.length + 1) !== root + path.sep) {
    throw new SrcError(t('markit.error.src_out_of_root', {src}));
  }

  return absolutePath;
}

let storage;

module.exports = async function (tokens, options) {

  if (!storage) {
    storage = require('engine/koa/tutorial').TutorialViewStorage.instance();
  }

  let methods = {
    blocktag_codetabs: src2plunk,
    blocktag_edit: src2plunk,
    blocktag_iframe,
    blocktag_source,
    link_open
  };

  async function src2plunk(token) {

    let src = path.join(options.resourceWebRoot, token.blockTagAttrs.src);

    let plunk = storage.get(src);

    if (!plunk) {
      throw new SrcError(t('markit.error.no_such_plunk', {src}));
    }

    token.plunk = plunk;
  }

  async function link_open(token) {
    let href = tokenUtils.attrGet(token, 'href');
    if (!href.startsWith('sandbox:')) return;

    let src = path.join(options.resourceWebRoot, href.slice('sandbox:'.length));

    let plunk = storage.get(src);

    if (!plunk) {
      throw new SrcError(t('markit.error.no_such_plunk', {src: href}));
    }

    tokenUtils.attrReplace(token, 'href', plunk.getUrl());
  }

  async function blocktag_iframe(token) {
    if (token.blockTagAttrs.edit || token.blockTagAttrs.zip) {
      await src2plunk(token);
    }
  }

  async function blocktag_source(token) {

    if (!token.blockTagAttrs.src) return;

    if (token.blockTagAttrs.src === true) {
      throw new SrcError('No value for attribute src (there should be no space in src=value)');
    }

    /*
    if (!token.blockTagAttrs.src.replace) { // findme: fixme: strange token for ar
      console.error("ODD", token);
    }
    */

    let sourcePath = srcUnderRoot(
      options.publicRoot,
      path.join(options.resourceWebRoot, token.blockTagAttrs.src.replace(/\.view/g, ''))
    );

    let content;

    try {
      content = await fs.readFile(sourcePath, 'utf-8');
    } catch (e) {
      console.error("Bad path", sourcePath);
      throw new SrcError(
        t('markit.error.read_file', {src: token.blockTagAttrs.src}) +
        ((process.env.NODE_ENV === 'development' || process.env.TUTORIAL_EDIT) ? ` [${sourcePath}]` : '')
      );
    }

    token.content = content;
  }

  async function walk(tokens, isInline) {

    for (let idx = 0; idx < tokens.length; idx++) {
      let token = tokens[idx];
      let process = methods[token.type];
      if (process) {
        try {
          await process(token);
        } catch (err) {
          if (err instanceof SrcError) {
            token.type = isInline ? 'markdown_error_inline' : 'markdown_error_block';
            token.content = err.message;
          } else {
            throw err;
          }
        }
      }

      if (token.children) {
        await walk(token.children, true);
      }

    }

  }


  await walk(tokens);
};


