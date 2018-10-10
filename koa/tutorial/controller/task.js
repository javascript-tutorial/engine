"use strict";

const Task = require('../models/task');
const Article = require('../models/article');
const TutorialTree = require('../models/tutorialTree');
const TaskRenderer = require('../renderer/taskRenderer');
const t = require('jsengine/i18n');
const TranslationStats = require('jsengine/translationStats').TranslationStats;
const config = require('config');

exports.get = async function(ctx, next) {

  const task = TutorialTree.instance().bySlug(ctx.params.slug);

  if (!task || !(task instanceof Task)) {
    await next();
    return;
  }

  const renderer = new TaskRenderer();

  const rendered = await renderer.render(task);

  ctx.locals.githubLink = task.githubLink;

  const translationStats = TranslationStats.instance();

  if (translationStats.isTranslated(task.getUrl()) === false && config.lang !== 'ru' && config.env !== 'development') {
    const currentLang = translationStats.getLangByCode(config.lang);
    const translatedLangs = translationStats.getMaterialLangs(task.getUrl());
    ctx.locals.translateNotification = t('tutorial.not_translated', {url: task.githubLink, translatedLangs, currentLang});
  }

  let breadcrumbs = [];

  let parentSlug = task.parent;
  while (true) {
    let parent = TutorialTree.instance().bySlug(parentSlug);
    if (!parent) break;
    breadcrumbs.push({
      url:   parent.getUrl(),
      title: parent.title
    });
    parentSlug = parent.parent;
  }
  breadcrumbs.push({
    title: t('tutorial.tutorial'),
    url:   '/'
  });

  ctx.locals.breadcrumbs = breadcrumbs.reverse();

  ctx.locals.currentSection = "tutorial";

  // No support for task.libs & head just yet (not needed?)
  ctx.locals.title = task.title;

  ctx.locals.task = {
    title:      task.title,
    importance: task.importance,
    content:    rendered.content,
    solution:   rendered.solution
  };

  ctx.locals.articleUrl = TutorialTree.instance().bySlug(task.parent).getUrl();

  ctx.body = ctx.render("task");
};

