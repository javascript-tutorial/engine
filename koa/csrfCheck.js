const PathListCheck = require('./pathListCheck');
const Tokens = require('csrf');

const tokens = new Tokens();

// NB: missing secret error may occur if you come from https to http (in dev mode)
// if you have old session with https cookie, 
// then come using http, then new session http cookie WON'T overwrite the secure one
// so new session can't be initialized, no secret can be stored

// don't update to koa-csrf v3
// update to koa-csrf v3 removes assertCSRF method (we need it!)
class CsrfChecker {
  constructor(app) {
    this.ignore = new PathListCheck();
    app.csrfChecker = this;

    // all context objects inherit from app.context
    Object.defineProperty(app.context, 'csrf', {
      get() {
        if (this._csrf) return this._csrf;
        if (!this.session) return null;

        if (!this.session.secret) {
          this.session.secret = tokens.secretSync();

          // console.log("SAVE SECRET", this.requestId, this.session.secret);
        }
        
        this._csrf = tokens.create(this.session.secret)
        return this._csrf;
      }
    });

    app.use(this.middleware());
    app.use(this.cookieMiddleware());

  }

  checkCsrf(ctx) {
    let token = (ctx.request.body && ctx.request.body._csrf) 
      || ctx.query._csrf
      || ctx.get('x-xsrf-token');

    if (!token) {
      ctx.throw(403, 'token is missing');
    }

    this.checkToken(ctx, token);
  }

  checkToken(ctx, token) {
    // console.log("CHECK TOKEN", ctx.requestId);
    // console.log("SESSION", ctx.session);

    let secret = ctx.session.secret;
    if (!secret) {
      ctx.throw(403, 'secret is missing');
    }

    if (!tokens.verify(secret, token)) {
      ctx.throw(403, 'invalid csrf token');
    }
  }


  middleware() {
    return async (ctx, next) => {
      // skip these methods
      if (ctx.method === 'GET' || ctx.method === 'HEAD' || ctx.method === 'OPTIONS') {
        return await next();
      }

      let shouldCheckCsrf = true;

      if (!ctx.user) {
        shouldCheckCsrf = false;
      }

      if (this.ignore.check(ctx.path)) {
        shouldCheckCsrf = false;
      }

      // If test check CSRF only when "X-Test-Csrf" header is set
      if (process.env.NODE_ENV == 'test') {
        if (!ctx.get('X-Test-Csrf')) {
          shouldCheckCsrf = false;
        }
      }

      if (shouldCheckCsrf) {
        this.checkCsrf(ctx);
      } else {
        ctx.log.debug("csrf skip");
      }

      await next();
    };
  }


  cookieMiddleware() {
    return async(ctx, next) => {
      try {
        // first, do the middleware, maybe authorize user in the process
        await next();
      } finally {
        // then if we have a user, set XSRF token
        if (ctx.user) {
          // console.log("CSRF SET", ctx.session.secret);
          this.setCsrfCookie(ctx);
        }
      }
    };
  }


  // XSRF-TOKEN cookie name is used in angular by default
  setCsrfCookie(ctx) {
    try {
      // if this doesn't throw, the user has a valid token in cookie already
      this.checkToken(ctx, ctx.cookies.get('XSRF-TOKEN'));
    } catch (err) {
      // error occurs if no token or invalid token (old session)
      // then we set a new (valid) one
      // ctx.log.debug("csrf token set", err.message, ctx.csrf);
      ctx.cookies.set('XSRF-TOKEN', ctx.csrf, {httpOnly: false, signed: false});
    }
  }

};


// every request gets different this._csrf to use in POST
// but ALL tokens are valid
exports.init = function(app) {
  new CsrfChecker(app);
};
