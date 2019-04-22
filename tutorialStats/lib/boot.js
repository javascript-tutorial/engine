const log = require('engine/log')();

const TutorialStats = require('./tutorialStats');

async function boot() {
  // if (!process.env.TUTORIAL_EDIT) {
    await TutorialStats.instance().update();
  // }
}

// add reboot action if pmx exists (for prod, not for local server)
process.on('message', function(packet) {
  log.info("process message", packet);
  if (packet.topic === 'tutorialStats:reboot') {
    log.info("tutorialStats reboot initiated");
    boot().then(function() { // if failed => uncaught promise && process dies?
      log.info("tutorialStats reboot complete")
    }).catch((err) => {
      log.error("tutorialStats reboot error", err);
      throw err;
    });
  }
});

module.exports = boot;
