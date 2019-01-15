
exports.init = function(app) {
  app.use(async function(ctx, next) {

    ctx.nocache = function() {
      ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    };

    ctx.cacheAnon = function(seconds) {
      if (ctx.user) {
        this.nocache();
      } else {
        ctx.set('Cache-Control', 'public,max-age=' + seconds);
      }
    };

    await next();
  });

};
