'use strict';

const mountHandlerMiddleware = require('engine/koa/mountHandlerMiddleware');

const t = require('engine/i18n');

exports.TutorialViewStorage = require('./models/tutorialViewStorage');
exports.Article = require('./models/article');
exports.Task = require('./models/task');
exports.TutorialTree = require('./models/tutorialTree');
exports.TutorialView = require('./models/tutorialView');

exports.TaskRenderer = require('./renderer/taskRenderer');
exports.ArticleRenderer = require('./renderer/articleRenderer');
exports.TutorialParser = require('./lib/tutorialParser');

exports.runImport = require('./lib/runImport');


exports.init = function(app) {
  app.use(mountHandlerMiddleware('/', __dirname));
};

exports.boot = require('./lib/boot');
