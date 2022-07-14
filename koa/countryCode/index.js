
exports.init = function(app) {

  app.use(async function(ctx, next) {
    ctx.countryCode = (process.env.COUNTRY_CODE_FORCE || ctx.get('cf-ipcountry') || ctx.get('x-nginx-geo') || '').toLowerCase();
    if (ctx.countryCode == 'xx') ctx.countryCode = ''; // CloudFlare cannot detect country
    await next();
  });

};
