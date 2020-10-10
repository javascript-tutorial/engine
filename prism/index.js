// prism requires data-manual attribute on the current script NOT to highlightAll automatically
let script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();
script.setAttribute('data-manual', 1);

require('./core');

let CodeBox = require('./codeBox');
let CodeTabsBox = require('./codeTabsBox');
let proxyConsoleLog = require('./proxyConsoleLog');

function initCodeBoxes(container) {
  // highlight inline
  let elems = container.querySelectorAll('.code-example:not([data-prism-highlighted])');

  for (let elem of elems) {
    new CodeBox(elem);
    elem.setAttribute('data-prism-highlighted', '1');
  }
}


function initCodeTabsBox(container) {

  let elems = container.querySelectorAll('div.code-tabs:not([data-prism-highlighted])');

  for (let elem of elems) {
    new CodeTabsBox(elem);
    elem.setAttribute('data-prism-highlighted', '1');
  }

}

exports.init = function () {
  document.removeEventListener('DOMContentLoaded', Prism.highlightAll);

  document.addEventListener('DOMContentLoaded', function() {
    highlight(document);
  });

  proxyConsoleLog();
};


function highlight(elem) {
  initCodeBoxes(elem);
  initCodeTabsBox(elem);
}

exports.highlight = highlight;
