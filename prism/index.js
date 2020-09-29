// prism requires data-manual attribute on the current script NOT to highlightAll automatically
let script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();
script.setAttribute('data-manual', 1);

require('./core');

let CodeBox = require('./codeBox');
let CodeTabsBox = require('./codeTabsBox');

let consoleFormat = require('lookatcode/client/consoleFormat');

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

function proxyConsoleLog() {
  window.consoleLogNative = console.log.bind(console);
  
  console.log = function(...args) {
    consoleLogNative(...args);
  
    let formattedArgs = consoleFormat(args);
    window.postMessage({type: 'console-log', log: formattedArgs}, '*');
  };

}

window.addEventListener('message', ({source, data}) => {

  // message from parent frame? never happens for console-log
  if (source != window && source == window.parent) return; 

  if (data.type != 'console-log') return;

  if (window.consoleLogTarget) {
    consoleLogTarget.consoleLog(data.log);
  }

});

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
