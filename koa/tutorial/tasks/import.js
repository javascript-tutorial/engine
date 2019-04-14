'use strict';

let CacheEntry;
try {
  CacheEntry = require('cache').CacheEntry;
} catch(e)  {
  /* ignore (no such module needed for local tutorial server */
}

let runImport = require('engine/koa/tutorial').runImport;
let log = require('engine/log')();

module.exports = function(options) {

  return function() {
    return async function() {

      await runImport();

      if (CacheEntry) {
        await CacheEntry.remove({});
      }

      console.log("Tutorial import finished.");

    }();
  };
};
