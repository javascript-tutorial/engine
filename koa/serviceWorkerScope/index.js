
exports.init = function(app) {

  app.use(async (ctx, next) => {
    // for our service workers allow any scope
    if (ctx.get('Service-Worker') == 'script') {
      ctx.set('Service-Worker-Allowed', '/');
    }
    await next();
  });

};
