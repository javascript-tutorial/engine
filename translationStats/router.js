'use strict';

const Router = require('koa-router');
const mustBeAdmin = require('auth').mustBeAdmin;
const router = module.exports = new Router();
const TranslationStats = require('./lib/translationStats');

// CRONTAB: run me every 2h
router.get('/update', mustBeAdmin, async function(ctx) {
  ctx.nocache();
  await TranslationStats.instance().update();
  ctx.body = { status: 'ok', time: new Date() };
});
