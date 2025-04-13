'use strict';

const assert = require('assert');

assert(typeof IS_CLIENT === 'undefined');

const { promisify } = require('util');
const imageSize = promisify(require('image-size').imageSize);

const path = require('path');
const tokenUtils = require('./utils/token');
const t = require('engine/i18n');
const fs = require('mz/fs');
const gm = require('gm');

t.requirePhrase('engine/markit');

class SrcError extends Error {
}

module.exports = async function(tokens, options) {


  for (let idx = 0; idx < tokens.length; idx++) {
    let token = tokens[idx];

    if (token.type == 'figure') {

      await processImageOrFigure(token);
      continue;
    }

    if (token.type != 'inline') continue;

    for (let i = 0; i < token.children.length; i++) {
      let inlineToken = token.children[i];
      // <td><figure></td> gives figure inside inline token
      if (inlineToken.type != 'image' && inlineToken.type != 'figure') continue;

      await processImageOrFigure(inlineToken);
    }

  }

  async function processImageOrFigure(token) {

    if (token.attrIndex('height') != -1 || token.attrIndex('width') != -1) return;

    try {
      await doProcessImageOrFigure(token);
    } catch (error) {
      if (error instanceof SrcError) {
        // replace image with error text
        token.type = (token.type == 'image') ? 'markdown_error_inline' : 'markdown_error_block';
        token.tag = '';
        token.children = null;
        token.attrs = null;
        token.content = error.message;
      } else {
        throw error;
      }

    }
  }

  function srcUnderRoot(root, src) {
    let absolutePath = path.join(root, src);

    if (absolutePath.slice(0, root.length + 1) !== root + path.sep) {
      throw new SrcError(t('markit.error.src_out_of_root', {src}));
    }

    return absolutePath;
  }

  async function getImageInfo(src) {

    let sourcePath = srcUnderRoot(
      options.publicRoot,
      src
    );

    // check readability
    let stat;

    // console.log("image", options.publicRoot, src, ' -> ', sourcePath);
    
    try {
      stat = await fs.stat(sourcePath);
    } catch (e) {
      throw new SrcError(t('markit.error.image_not_found', {src}));
    }

    if (!stat.isFile()) {
      throw new SrcError(t('markit.error.image_not_found', {src}));
    }

    if (/\.svg$/i.test(sourcePath)) {
      try {
        let size = await new Promise((resolve, reject) => {
          // GraphicsMagick fails with `gm identify my.svg`
          gm(sourcePath)
            .options({imageMagick: true})
            .identify('{"width":%w,"height":%h}', (err, res) => err ? reject(err) : resolve(res));
        });

        size = JSON.parse(size); // warning: no error processing

        return size;
      } catch (e) {
        throw new SrcError(`${src}: ${e.message}`);
      }
    }

    try {
      return await imageSize(sourcePath);
    } catch (e) {
      if (e instanceof TypeError) {
        throw new SrcError(t('markit.error.image_invalid', {src}));
      }

      throw new SrcError(`${src}: ${e.message}`);
    }
  }

  async function doProcessImageOrFigure(token) {
    let src = tokenUtils.attrGet(token, 'src');
    // ignore absolute links (to external resources)
    if (!src || src.includes('://')) return;

    let imageInfo = await getImageInfo(src);

    tokenUtils.attrReplace(token, 'width', imageInfo.width);
    tokenUtils.attrReplace(token, 'height', imageInfo.height);
  }


};


