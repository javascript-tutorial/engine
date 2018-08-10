'use strict';

let runImport = require('tutorial').runImport;
let log = require('@jsengine/log')();

module.exports = function(options) {

  return function() {
    return runImport();
  };
};


