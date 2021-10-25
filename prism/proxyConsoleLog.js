let consoleFormat = require('engine/console/consoleFormat');

module.exports = function proxyConsoleLog() {
  // use window.console.log to work around "drop_console: true" in webpack uglify settings
  window.consoleLogNative = window.console.log.bind(console);

  // console.log for the main window
  // js code always has globalThis.__codeBoxId
  // trusted iframe uses its own console.log (created in codeBox.js)
  // untrusted uses lookatcode/consoleLog module and window.name
  console.log = function(...args) {
    consoleLogNative(...args);

    let formattedArgs = consoleFormat(args);
    // in the main window we have: window.__codeBoxId,
    let message = {
      type: 'console-log',
      log: formattedArgs,
      codeBoxId: window.__codeBoxId
    };

    // console.info("message sent", message);
    window.postMessage(message, '*');
  };

  window.addEventListener('message', ({source, data}) => {

    // message from parent frame? never happens for console-log
    if (source != window && source == window.parent) return;

    if (data.type != 'console-log') return;
    // console.info("message received", data);

    let codeBoxElem = document.getElementById(data.codeBoxId);
    if (!codeBoxElem) {
      console.error("No codeBoxElem", data);
      return;
    }

    let codeBox = codeBoxElem.codeBox;
    codeBox.consoleLog(data.log);

  });

};