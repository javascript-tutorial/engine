'use strict';

/**
 * Reads attrs from ![alt|height=100 width=200](...) into image token
 *
 * P.S. Plugins that work like ![...](/url =100x150) require special parser, not markdown-compatible markup
 */

const parseAttrs = require('../utils/parseAttrs');
const tokenUtils = require('../utils/token');
const escapeHtml = require('escape-html');

function imgFigures(state) {

  for (let idx = 1; idx < state.tokens.length - 1; idx++) {
    let token = state.tokens[idx];

    if (token.type !== 'inline') continue;

    // inline token must have 1 child
    if (!token.children || token.children.length !== 1) continue;
    // child is image
    if (token.children[0].type !== 'image') continue;
    // prev token is paragraph open

    let isInParagraph = state.tokens[idx - 1].type == 'paragraph_open' &&
        state.tokens[idx + 1].type == 'paragraph_close';

    let hasFigureAttr = tokenUtils.attrGet(token.children[0], 'figure');

    tokenUtils.attrDel(token.children[0], 'figure'); // this attr is not needed any more

    if (!isInParagraph && !hasFigureAttr) continue;

    // we have a figure!
    // replace <p><img></p> with figure
    let figureToken = token.children[0];
    figureToken.type = 'figure';
    figureToken.tag = 'figure';

    if (isInParagraph) {
      state.tokens.splice(idx - 1, 3, figureToken);
    }
  }

}

module.exports = function(md) {

  md.core.ruler.push('img_figures', imgFigures);

  md.renderer.rules.figure = function(tokens, idx, options, env, slf) {
    let token = tokens[idx];
    let width = tokenUtils.attrGet(token, 'width');
    let height = tokenUtils.attrGet(token, 'height');

    if (options.ebookType || !width || !height) {
      tokenUtils.attrDel(token, 'width'); // for epub, it's better to autocalc width/height
      tokenUtils.attrDel(token, 'height');

      return `<figure><img${slf.renderAttrs(token)}></figure>`;
    }

    // here we assume a figure <img> has no "class" attribute
    // so we put our own class on it
    // (if it had, it would refer to figure?)

    let src = tokenUtils.attrGet(token, 'src');

    let img;
    if (!src.endsWith('.svg')) {
      img = `<img${slf.renderAttrs(token)} class="image__image">`;
    } else {
      img = `<object type="image/svg+xml" data="${src}" width="${width}" height="${height}" class="image__image" data-use-theme>
        <img${slf.renderAttrs(token)}>
      </object>`;
    }

    let figureAttrs = {
      style: ''
    };

    let imageDivAttrs = {
      style: `width:${width}px;`
    };

    let code = tokenUtils.attrGet(token, 'code');
    if (code) {
      let [codeShiftX, codeShiftY] = code.split(':').map(Number);
      figureAttrs.style += `position: relative; padding-bottom: calc(${height}px - (22px + ${codeShiftY*20}px));`;
      imageDivAttrs.style += `position: absolute; z-index: 1; bottom: calc(-22px + -${codeShiftY*20}px); left: ${codeShiftX}em;`;
      // console.log('code', code);
    }

    return `<figure${renderAttrsObj(figureAttrs)}><div class="image" ${renderAttrsObj(imageDivAttrs)}>
      <div class="image__ratio" style="padding-top:${height / width * 100}%"></div>
      ${img}
      </div></figure>`;

  };
};

function renderAttrsObj(attrs) {
  let result = '';
  for (let key in attrs) {
    result += ' ' + escapeHtml(key) + '="' + escapeHtml(attrs[key]) + '"';
  }
  return result;
}