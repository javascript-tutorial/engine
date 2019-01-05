const path = require('path');
const fs = require('mz/fs');
const config = require('config');
const TutorialViewStorage = require('../models/tutorialViewStorage');
const TutorialTree = require('../models/tutorialTree');
const log = require('jsengine/log')();

// pm2 trigger javascript tutorial_boot
async function boot() {
  if (process.env.TUTORIAL_EDIT) {
    // tutorial is imported and watched by another task
    return;
  }
  if (!await fs.exists(path.join(config.cacheRoot, 'tutorialTree.json'))) {
    throw new Error("FATAL: Tutorial not imported into cache. No tutorialTree.json");
  }

  await TutorialTree.instance().loadFromCache();

  await TutorialViewStorage.instance().loadFromCache();
}

// add reboot action if pmx exists (for prod, not for local server)
process.on('message', function(packet) {
  log.debug("process message", packet);
  if (packet.topic === 'tutorial:reboot') {
    log.debug("tutorial reboot initiated");
    boot().then(function() { // if failed => uncaught promise && process dies?
      log.debug("tutorial reboot complete")
    });
  }
});

/*

if (io) {
  io.action('tutorial_boot', function(reply) {
    boot().then(() => {
      reply({ answer : 'ok' });
    });
  });
}
*/
module.exports = boot;
