
exports.init = function(app) {
  // koa-flash is broken
  // reading from one object, writing to another object
  // occasionally writing to default
  app.use(async function flash(ctx, next) {

    // ctx.flash is the previous flash
    ctx.flash = ctx.session.flash || {};

    // overwrite ctx.session.flash with a new object
    // thus deleting the old content
    // ctx.newFlash is an accessor to the new flash
    ctx.session.flash = {};

    Object.defineProperty(ctx, 'newFlash', {
      get: function() {
        return ctx.session.flash;
      },
      set: function(val) {
        ctx.session.flash = val;
      }
    });

    await next();

    // note that ctx.session can be null
    // (logout does that)
    // note that ctx.session.flash may not exist (if session just created)
    if (ctx.session && ctx.session.flash && Object.keys(ctx.session.flash).length === 0) {
      // don't write empty new flash
      delete ctx.session.flash;
    }

    if (ctx.status == 302 && ctx.session && !ctx.session.flash) {
      // pass on the flash over a redirect
      ctx.session.flash = ctx.flash;
    }
  });

  app.use(async function(ctx, next) {

    let notificationTypes = ["error", "warning", "info", "success"];

    // by default koa-flash uses same defaultValue object for all flashes,
    // ctx.flash.message writes to defaultValue!

    ctx.addFlashMessage = function(type, html) {
      // split ctx.flash from defaultValue (fix bug in koa-flash!)
      if (!ctx.newFlash.messages) {
        ctx.newFlash.messages = [];
      }

      if (!~notificationTypes.indexOf(type)) {
        throw new Error("Unknown flash type: " + type);
      }

      ctx.newFlash.messages.push({
        type: type,
        html: html
      });
    };

    await next();

  });
};
