'use strict';

/**
 * Import figures.sketch into tutorial
 * @type {FiguresImporter|exports}
 */

let FigmaImporter = require('../lib/figmaImporter');

let fs = require('fs');
let path = require('path');
let log = require('engine/log')();
let config = require('config');

module.exports = async function() {

  let root = fs.realpathSync(config.tutorialRoot);

  let importer = new FigmaImporter({
    root
  });

  await importer.syncFigures();

  log.info("Figures imported");
};


