const path = require('path');
const fs = require('mz/fs');
const config = require('config');
const TutorialViewStorage = require('../models/tutorialViewStorage');
const TutorialTree = require('../models/tutorialTree');

// pm2 trigger javascript tutorial_boot
async function boot() {
  if (process.env.TUTORIAL_EDIT) {
    // tutorial is imported and watched by another task
    return;
  }
  if (!await fs.exists(path.join(config.cacheRoot, 'tutorialTree.json'))) {
    throw new Error("Tutorial not imported? No cache/tutorialTree.json");
  }

  let tree = await fs.readFile(path.join(config.cacheRoot, 'tutorialTree.json'));
  tree = JSON.parse(tree);
  TutorialTree.instance().load(tree);

  let views = await fs.readFile(path.join(config.cacheRoot, 'tutorialViewStorage.json'));
  views = JSON.parse(views);
  TutorialViewStorage.instance().load(tree);
}

// add reboot action if pmx exists (for prod, not for local server)
let pmx;
try {
  pmx = require('pmx');
} catch(e) {
  pmx = null;
}

if (pmx) {
  pmx.action('tutorial_boot', function(reply) {
    boot().then(() => {
      reply({ answer : 'ok' });
    });
  });
}

module.exports = boot;