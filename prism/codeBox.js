let resizeOnload = require('client/head/resizeOnload');
let isScrolledIntoView = require('client/isScrolledIntoView');
let makeLineNumbers = require('./makeLineNumbers');
let makeHighlight = require('./makeHighlight');
const { highlight } = require('prismjs');
const config = require('config');
let consoleFormat = require('engine/console/consoleFormat');
const t = require('engine/i18n/t');

const LANG = require('config').lang;
t.i18n.add('prism', require('./locales/' + LANG + '.yml'));

function CodeBox(elem) {

  let preElem = elem.querySelector('pre');
  let codeElem = Array.from(preElem.childNodes).find(n => n.tagName === 'CODE');

  let code = codeElem.textContent;

  let outputBox;

  elem.codeBox = this;
  
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

  let useStrict = (!isNoStrict && isJS) ? `"use strict";` : '';
  
  // globalEval evaluates asynchronously, so we must inject codeBox id into the code
  // then in console.log we use it to show the message under the current box
  let codeBoxId = `globalThis.__codeBoxId = "${elem.id}";`;

  runCode=`${useStrict}${codeBoxId}\n\n${runCode}`;

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
    win.postMessage(runCode, config.lookatCodeUrlBase + '/showjs');
  }

  
  function emphasize(codeElem, ranges) {
    let codeHtml = codeElem.innerHTML;
    let split = codeHtml.split(/\n/);
    
    for(let range of ranges) {
      if (range.end !== undefined) {
        // block emphasize
        split[range.start] = '<em class="block-highlight">' + split[range.start];
        split[range.end] += '</em>';
      } else {
        let line = split[range.start];
        let cols = range.cols;
        let inTag = false;
        let charCounter = -1;
        let resultLine = '';
        /*
        if (cols.find(c => c.start == 0)) {
          resultLine += '<em class="inline-highlight">';
        }
        */
        // line = line.replace(/<.*?>/g, '<s>');
        //line = `alert('Start of try runs');  // (1) &lt;---`;

        for(let i = 0; i < line.length ; i++) {
          if (line[i] == '<') inTag = true;
          
          if (inTag) {
            resultLine += line[i];
          } else {
            charCounter++;

            if (cols.find(c => c.start == charCounter)) {
              resultLine += '<em class="inline-highlight">';
            }

            resultLine += line[i];

            if (line[i] == '&') { // entities, such as &lt; are counted as single char in range.cols
              let entities = ['lt;', 'gt;', 'amp;', 'quot;'];
              for(let entity of entities) {
                if (line.slice(i + 1, i + 1 + entity.length) == entity) {
                  i += entity.length;
                  resultLine += entity;
                }
              }
            }

            if (cols.find(c => c.end == charCounter + 1)) {
              resultLine += '</em>';
            }
          }
          
          if (line[i] == '>') inTag = false;
        }
        /*
        if (cols.find(c => c.end == charCounter + 1)) {
          resultLine += '</em>';
        }*/
        
        split[range.start] = resultLine;
      }

    }
    codeElem.innerHTML = split.join('\n');
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
      frame.name = elem.id; // for console.log
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

    if (isTrusted && !frame.hasCustomConsoleLog) {
      // iframe may have been generated above OR already put in HTML by autorun
      frame.hasCustomConsoleLog = true;
      let consoleLogNative = frame.contentWindow.console.log.bind(frame.contentWindow.console);
  
      // bind console.log to the current elem.id
      frame.contentWindow.console.log = function(...args) {
        consoleLogNative(...args);
      
        let formattedArgs = consoleFormat(args);
        window.postMessage({type: 'console-log', log: formattedArgs, codeBoxId: elem.id}, '*');
      };
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
      form.action = config.lookatCodeUrlBase + "/showhtml";
      form.target = frame.name;

      let textarea = document.createElement('textarea');
      textarea.name = 'code';

      let normalizedCode = normalizeHtml(code);
      if (normalizedCode.includes('console.log')) {
        // insert after <head> or <body>, to ensure that console.log is replaced immediately
        normalizedCode = normalizedCode.replace(/<head>|<body>/im, '$&__LOOKATCODE_SCRIPT__');
      }
      textarea.value = normalizedCode;
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
  function globalEval(code) {
    let script = document.createElement( "script" );
    script.type = 'module';
    script.text = code;
    document.head.append(script);
    script.remove();
  }

  this.consoleLog = function(args) {
    if (!outputBox) {
      outputBox = document.createElement('div');
      outputBox.className = 'codebox__output';

      elem.append(outputBox);

      let label = document.createElement('div');
      label.className = 'codebox__output-label';
      label.innerHTML = t('prism.output');
      outputBox.append(label);
    }

    let logElem = document.createElement('div');
    logElem.className = 'codebox__output-line';
    logElem.innerHTML = args;
    outputBox.append(logElem);
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
      form.action = config.lookatCodeUrlBase + "/showhtml";
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
        // make sure functions from "autorun" go to global scope (eval has its own scope)
        globalEval(runCode);
        return;
      }

      try {
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
        jsFrame.src = config.lookatCodeUrlBase + '/showjs';
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

    if (outputBox) {
      outputBox.remove();
      outputBox = null;
    }

    if (isJS) {
      runJS();
    } else {
      runHTML();
    }
    isFirstRun = false;
  }


}



module.exports = CodeBox;
