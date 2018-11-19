"use strict";

// Adapted and rewritten, from restify by Ilya Kantor
// initial Copyright 2012 Mark Cavage, Inc.  All rights reserved.
let Stream = require('stream').Stream;
let fs = require('fs');

let bunyan = require('bunyan');
let path = require('path');
let config = require('config');
let lastCache = 0;
let hasFile = false;
module.exports = class DebugStream extends Stream {

  write(record) {

    let logFilePath = path.join(config.tmpRoot, 'log-debug');

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

