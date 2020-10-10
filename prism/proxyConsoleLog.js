let consoleFormat = require('lookatcode/client/consoleFormat');

module.exports = function proxyConsoleLog() {
  window.consoleLogNative = console.log.bind(console);
  
  console.log = function(...args) {
    consoleLogNative(...args);
  
    let formattedArgs = consoleFormat(args);
    window.postMessage({type: 'console-log', log: formattedArgs}, '*');
  };

  window.addEventListener('message', ({source, data}) => {

    // message from parent frame? never happens for console-log
    if (source != window && source == window.parent) return; 

    if (data.type != 'console-log') return;

    if (window.consoleLogTarget) {
      consoleLogTarget.consoleLog(data.log);
    }

  });
};