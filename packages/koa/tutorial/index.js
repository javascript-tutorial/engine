'use strict';

const mountHandlerMiddleware = require('@jsengine/koa/mountHandlerMiddleware');

const t = require('@jsengine/i18n');

exports.TutorialViewStorage = require('./models/tutorialViewStorage');
exports.Article = require('./models/article');
exports.Task = require('./models/task');
exports.TutorialTree = require('./models/tutorialTree');
exports.TutorialView = require('./models/tutorialView');

exports.TaskRenderer = require('./renderer/taskRenderer');
exports.ArticleRenderer = require('./renderer/articleRenderer');

exports.runImport = require('./lib/runImport');


exports.init = function(app) {
  app.use(mountHandlerMiddleware('/', __dirname));
};

exports.boot = require('./lib/boot');