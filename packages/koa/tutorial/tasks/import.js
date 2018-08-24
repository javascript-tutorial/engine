'use strict';

let runImport = require('@jsengine/koa/tutorial').runImport;
let log = require('@jsengine/log')();

module.exports = function(options) {

  return function() {
    return runImport();
  };
};


