let TutorialStats = require('./lib/tutorialStats');

let mountHandlerMiddleware = require('engine/koa/mountHandlerMiddleware');

exports.init = function(app) {
  app.use(mountHandlerMiddleware('/tutorial-stats', __dirname));
};

exports.boot = async function() {
  if (!process.env.TUTORIAL_EDIT) {
    await TutorialStats.instance().update();
  }
};

exports.TutorialStats = TutorialStats;
