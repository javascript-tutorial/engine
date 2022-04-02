const PathListCheck = require('./pathListCheck');

class VerboseLogger {
  constructor() {
    this.logPaths = new PathListCheck();
  }

  middleware() {

    return async(ctx, next) => {

      if (this.logPaths.check(ctx.path)) {
        ctx.log.info({requestVerbose: ctx.request});
      }

      await next();
    };

  }
}

exports.init = function(app) {

  app.verboseLogger = new VerboseLogger();
  app.use(app.verboseLogger.middleware());

};
