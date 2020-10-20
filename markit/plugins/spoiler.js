const markdownItContainer = require('markdown-it-container');
const parseAttrs = require('../utils/parseAttrs');
const t = require('engine/i18n/t');
const config = require('config');

module.exports = function(md) {

  md.use(markdownItContainer, 'spoiler', {
    marker: '`',
    render(tokens, idx, options, env, slf) {

      if (tokens[idx].nesting === 1) {
        let attrs = parseAttrs(tokens[idx].info, true);
        let header = attrs.header;
        if (header) {
          header = md.renderInline(header);
        } else {
          header = 'Read more about it'; // t(`markit.spoiler....`);
        }
        return `<div class="spoiler closed">
          <button class="spoiler__button">${header}</button>
          <div class="spoiler__content">`;

      } else {
        // closing tag
        return '</div></div>\n';
      }
    }
  });



};
