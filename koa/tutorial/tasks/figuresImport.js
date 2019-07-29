'use strict';

/**
 * Import figures.sketch into tutorial
 * @type {FiguresImporter|exports}
 */

let FiguresImporter = require('../lib/figuresImporter');

let fs = require('fs');
let path = require('path');
let log = require('engine/log')();
let config = require('config');

module.exports = async function() {

  let root = fs.realpathSync(config.tutorialRoot);

  let importer = new FiguresImporter({
    root,
    figuresFilePath: process.env.FIGURES_ROOT || path.join(root, 'figures.sketch')
  });

  await importer.syncFigures();

  log.info("Figures imported");
};


