'use strict';

let CacheEntry;
try {
  CacheEntry = require('caches').CacheEntry;
} catch (e) {
  /* ignore (no such module needed for local tutorial server */
}

let runImport = require('engine/koa/tutorial').runImport;
let log = require('engine/log')();

module.exports = async function() {

  await runImport();

  if (CacheEntry) {
    await CacheEntry.deleteMany({});
  }

  console.log("Tutorial import finished.");
};
