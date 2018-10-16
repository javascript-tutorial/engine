'use strict';

const TutorialViewStorage = require('../models/tutorialViewStorage');
const TutorialTree = require('../models/tutorialTree');

exports.get = async function(ctx, next) {

  ctx.nocache();

  if (!ctx.isAdmin) {
    ctx.throw(403);
  }

  await TutorialTree.instance().loadFromCache();
  await TutorialViewStorage.instance().loadFromCache({allowEmpty: false});

  ctx.body = "Reloaded.";
};
