let resizeOnload = require('client/head/resizeOnload');
let isScrolledIntoView = require('client/isScrolledIntoView');
let makeLineNumbers = require('./makeLineNumbers');
let makeHighlight = require('./makeHighlight');
const { highlight } = require('prismjs');

function CodeBox(elem) {

  let preElem = elem.querySelector('pre');
  let codeElem = Array.from(preElem.childNodes).find(n => n.tagName === 'CODE');

  let code = codeElem.textContent;

  let runCode = code;
  if (elem.hasAttribute('data-async')) {
    runCode = `(async () => {\n${code}\n})()`;
  }

  Prism.highlightElement(codeElem);

  let lineNumbersWrapper = makeLineNumbers(preElem.innerHTML);

  /*
  if (preElem.hasAttribute('data-start')) {
    preElem.style.counterReset = 'linenumber ' + Number(preElem.dataset.start) - 1;
  }
  */

  preElem.insertAdjacentHTML("afterBegin", lineNumbersWrapper);

  let ranges = JSON.parse(elem.getAttribute('data-highlight'));
  if (ranges) {
    emphasize(codeElem, ranges);
  }

  // preElem.insertAdjacentHTML("afterBegin", masks);

  let isJS = preElem.classList.contains('language-javascript');
  let isHTML = preElem.classList.contains('language-markup');
  let isTrusted = +elem.getAttribute('data-trusted');
  let isNoStrict = +elem.getAttribute('data-no-strict');

  if (!isNoStrict && isJS) {
    runCode="'use strict';\n\n" + runCode;
  }

  let jsFrame;
  let globalFrame;
  let htmlResult;
  let isFirstRun = true;

  if (!isJS && !isHTML) return;

  let runElem = elem.querySelector('[data-action="run"]');
  if (runElem) {
    runElem.onclick = function() {
      this.blur();
      run();
      return false;
    };
  }

  let editElem = elem.querySelector('[data-action="edit"]');
  if (editElem) {
    editElem.onclick = function() {
      this.blur();
      edit();
      return false;
    };
  }

  // some code can't be shown by epub engine
  if (elem.hasAttribute('data-autorun')) {
    if(window.ebookType == 'epub' && elem.getAttribute('data-autorun') == 'no-epub') {
      elem.querySelector('iframe').remove();
    } else {
      // timeout should be small, around 10ms, or remove it to make crawler process the autorun
      setTimeout(run, 100);
      // run();
    }
  }

  function postJSFrame() {
    let win = jsFrame.contentWindow;
    if (typeof win.postMessage !== 'function') {
      alert("Sorry, your browser is too old");
      return;
    }
    win.postMessage(runCode, 'https://lookatcode.com/showjs');
  }

  function emphasize(codeElem, ranges) {
    let codeHtml = codeElem.innerHTML;
    for(let range of ranges) {
      if (range.start !== undefined && range.end !== undefined) {
        // full line emphasize
        let split = codeHtml.split(/\n/);
        codeHtml = split.slice(0, range.start).join('\n') +
           '<div class="block-highlight">' +
           split.slice(range.start, range.end + 1).join('\n') + '</div>' +
           split.slice(range.end + 1).join('\n')
        // debugger;
        
      }
    }
    codeElem.innerHTML = codeHtml;
  }

  function runHTML() {

    let frame;

    if (htmlResult && elem.hasAttribute('data-refresh')) {
      htmlResult.remove();
      htmlResult = null;
    }

    if (!htmlResult) {
      // take from HTML if exists there (in markup when autorun is specified)
      htmlResult = elem.querySelector('.code-result');
    }

    if (!htmlResult) {
      // otherwise create (or recreate if refresh)
      htmlResult = document.createElement('div');
      htmlResult.className = "code-result code-example__result";

      frame = document.createElement('iframe');
      frame.name = 'frame-' + Math.random();
      frame.className = 'code-result__iframe';

      if (elem.getAttribute('data-demo-height') === "0") {
        // this html has nothing to show
        htmlResult.style.display = 'none';
      } else if (elem.hasAttribute('data-demo-height')) {
        let height = +elem.getAttribute('data-demo-height');
        frame.style.height = height + 'px';
      }
      htmlResult.appendChild(frame);

      elem.appendChild(htmlResult);
    } else {
      frame = htmlResult.querySelector('iframe');
    }

    if (isTrusted) {
      let doc = frame.contentDocument || frame.contentWindow.document;

      doc.open();
      // console.log(code)
      doc.write(normalizeHtml(code));
      doc.close();

      if (!elem.hasAttribute('data-demo-height')) {
        resizeOnload.iframe(frame);
      }

      if (!(isFirstRun && elem.hasAttribute('data-autorun'))) {
        if (!isScrolledIntoView(htmlResult)) {
          htmlResult.scrollIntoView(false);
        }
      }

    } else {
      let form = document.createElement('form');
      form.style.display = 'none';
      form.method = 'POST';
      form.enctype = "multipart/form-data";
      form.action = "https://lookatcode.com/showhtml";
      form.target = frame.name;

      let textarea = document.createElement('textarea');
      textarea.name = 'code';
      textarea.value = normalizeHtml(code);
      form.appendChild(textarea);

      frame.parentNode.insertBefore(form, frame.nextSibling);
      form.submit();
      form.remove();

      if (!(isFirstRun && elem.hasAttribute('data-autorun'))) {
        frame.onload = function() {

          if (!elem.hasAttribute('data-demo-height')) {
            resizeOnload.iframe(frame);
          }

          if (!isScrolledIntoView(htmlResult)) {
            htmlResult.scrollIntoView(false);
          }
        };
      }
    }

  }

  // Evaluates a script in a global context
  function globalEval( code ) {
    let script = document.createElement( "script" );
    script.type = 'module';
    script.text = code;
    document.head.appendChild( script ).parentNode.removeChild( script );
  }

  function runJS() {

    if (elem.hasAttribute('data-global')) {
      if (!globalFrame) {
        globalFrame = document.createElement('iframe');
        globalFrame.className = 'js-frame';
        globalFrame.style.width = 0;
        globalFrame.style.height = 0;
        globalFrame.style.border = 'none';
        globalFrame.name = 'js-global-frame';
        document.body.appendChild(globalFrame);
      }

      let form = document.createElement('form');
      form.style.display = 'none';
      form.method = 'POST';
      form.enctype = "multipart/form-data";
      form.action = "https://lookatcode.com/showhtml";
      form.target = 'js-global-frame';

      let textarea = document.createElement('textarea');
      textarea.name = 'code';
      textarea.value = normalizeHtml(`<script>\n${runCode}\n</script>`);
      form.appendChild(textarea);

      globalFrame.parentNode.insertBefore(form, globalFrame.nextSibling);
      form.submit();
      form.remove();
    } else if (isTrusted) {

      if (elem.hasAttribute('data-autorun')) {
        // make sure functions from "autorun" go to global scope
        globalEval(runCode);
        return;
      }

      try {
        /* jshint -W061 */
        window["eval"].call(window, runCode);
      } catch (e) {
        alert(e.constructor.name + ": " + e.message);
      }

    } else {

      if (elem.hasAttribute('data-refresh') && jsFrame) {
        jsFrame.remove();
        jsFrame = null;
      }

      if (!jsFrame) {
        // create iframe for js
        jsFrame = document.createElement('iframe');
        jsFrame.className = 'js-frame';
        jsFrame.src = 'https://lookatcode.com/showjs';
        jsFrame.style.width = 0;
        jsFrame.style.height = 0;
        jsFrame.style.border = 'none';
        jsFrame.onload = function() {
          // error with "null" target if fails to load jsFrame
          postJSFrame();
        };
        document.body.appendChild(jsFrame);
      } else {
        postJSFrame();
      }
    }

  }

  function edit() {

    let html;
    if (isHTML) {
      html = normalizeHtml(code);
    } else {
      // let codeIndented = code.replace(/^/gim, '    ');
      html = `<!DOCTYPE html>\n<script>\n${runCode}\n</script>`;
    }

    let form = document.createElement('form');
    form.action = "https://plnkr.co/edit/?p=preview";
    form.method = "POST";
    form.target = "_blank";

    document.body.appendChild(form);

    let textarea = document.createElement('textarea');
    textarea.name = "files[index.html]";
    textarea.value = html;
    form.appendChild(textarea);

    let input = document.createElement('input');
    input.name = "description";
    input.value = "Fork from " + window.location;
    form.appendChild(input);

    form.submit();
    form.remove();
  }


  function normalizeHtml(code) {
    let hasDocType = code.match(/^\s*<!doctype/i);

    if (hasDocType) {
      return code;
    }

    let result = code;

    if (!code.match(/<body/i)) {
      result = `<body>\n${result}\n</body>`;
    }

    result = '<!doctype html>\n' + result;

    return result;
  }


  function run() {
    if (isJS) {
      runJS();
    } else {
      runHTML();
    }
    isFirstRun = false;
  }


}



module.exports = CodeBox;
