'use strict';

const Router = require('koa-router');
const mustBeAdmin = require('auth').mustBeAdmin;
const router = module.exports = new Router();
const TutorialStats = require('./lib/tutorialStats');

// CRONTAB: run me every 2h
router.get('/update', mustBeAdmin, async function(ctx) {
  ctx.nocache();
  await TutorialStats.instance().update();
  ctx.body = { status: 'ok', time: new Date() };
});
