'use strict';

let CacheEntry = require('cache').CacheEntry;
let runImport = require('engine/koa/tutorial').runImport;
let log = require('engine/log')();

module.exports = function(options) {

  return function() {
    return async function() {

      await runImport();

      await CacheEntry.remove({});

      console.log("Tutorial import finished.");

    }();
  };
};
