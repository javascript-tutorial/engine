// Create file 'log-debug' in tmpRoot, and then all logs go to it

let Stream = require('stream').Stream;
let fs = require('fs');
let path = require('path');

// leads to circular dep when running mocha.sh
// let config = require('config');

let lastCache = 0;
let hasFile = false;

module.exports = class DebugStream extends Stream {

  write(record) {

    let logFilePath = '/tmp/log-debug';

    if (lastCache < Date.now() - 100) {
      hasFile = fs.existsSync(logFilePath);
      lastCache = Date.now();
    }

    if (!hasFile) return;

    // if (typeof record === 'object') {
    //   record = JSON.stringify(record, bunyan.safeCycles()) + '\n';
    // }

    fs.writeFile(logFilePath, record, {flag:'a'}, function(err) {
      if (err) console.error("LOG ERROR", err);
    });

  }

};

