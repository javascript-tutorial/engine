'use strict';

let TutorialImporter = require('../lib/tutorialImporter');
let TutorialTree = require('../models/tutorialTree');
let TutorialViewStorage = require('../models/tutorialViewStorage');
let config = require('config');
let fs = require('mz/fs');
let path = require('path');
let log = require('engine/log')();

module.exports = async function() {

  let tree = TutorialTree.instance();
  let viewStorage = TutorialViewStorage.instance();

  let importer = new TutorialImporter({
    root: config.tutorialRoot,
    parserDryRunEnabled: true
  });

  tree.clear();
  await TutorialViewStorage.instance().loadFromCache({allowEmpty: true});

  let subRoots = fs.readdirSync(config.tutorialRoot);

  for (let subRoot of subRoots) {
    if (!parseInt(subRoot)) continue;
    await importer.sync(path.join(config.tutorialRoot, subRoot));
  }

  await tree.saveToCache();
  await viewStorage.saveToCache();
  // await importer.generateCaches();

  log.info("Tutorial import complete");
};


