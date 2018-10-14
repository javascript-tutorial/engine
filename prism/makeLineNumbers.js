
// const escapeHtml = require('escape-html');

module.exports = function makeLineNumbers(html) {

  let linesNum = (1 + html.split('\n').length);
  let lineNumbersWrapper;

  let lines = new Array(linesNum);
  lines = lines.join('<span></span>');

  lineNumbersWrapper = `<span class="line-numbers-rows">${lines}</span>`;

  return lineNumbersWrapper;
};
