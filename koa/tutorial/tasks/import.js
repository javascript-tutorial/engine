'use strict';

let CacheEntry = require('cache').CacheEntry;
let runImport = require('jsengine/koa/tutorial').runImport;
let log = require('jsengine/log')();

module.exports = function(options) {

  return function() {
    return async function() {

      await runImport();

      await CacheEntry.remove({});

      console.log("Tutorial import finished.");

    }();
  };
};
