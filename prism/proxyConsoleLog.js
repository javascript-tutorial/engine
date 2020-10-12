let consoleFormat = require('engine/console/consoleFormat');

module.exports = function proxyConsoleLog() {
  // use window.console.log to work around drop_console: true in webpack uglify settings
  window.consoleLogNative = window.console.log.bind(console);
  
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