'use strict';

const mountHandlerMiddleware = require('@jserror/koa-utils').mountHandlerMiddleware;

exports.init = function(app) {
  app.use(mountHandlerMiddleware('/', __dirname));
};

