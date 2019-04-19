let TutorialStats = require('./lib/tutorialStats');

let mountHandlerMiddleware = require('engine/koa/mountHandlerMiddleware');

exports.init = function(app) {
  app.use(mountHandlerMiddleware('/tutorial-stats', __dirname));
};

exports.boot = require('./lib/boot');

exports.TutorialStats = TutorialStats;
