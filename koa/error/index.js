const config = require('config');
const escapeHtml = require('escape-html');
const path = require('path');

let isDevelopment = process.env.NODE_ENV == 'development';

const t = require('engine/i18n');

// can be called not from this MW, but from anywhere
// this.templateDir can be anything
function renderError(ctx, err) {

  // don't pass just err, because for "stack too deep" errors it leads to logging problems
  let report = {
    message: err.message,
    stack: err.stack,
    errors: err.errors, // for validation errors
    status: err.status,
    referer: ctx.get('referer'),
    cookie: ctx.get('cookie')
  };
  if (!err.expose) { // dev error
    report.requestVerbose = ctx.request;
  }

  ctx.log.error(report);

  // may be error if headers are already sent!
  ctx.set('X-Content-Type-Options', 'nosniff');

  let preferredType = ctx.accepts('html', 'json');

  // malformed or absent mongoose params
  if (err.name == 'CastError' && process.env.NODE_ENV == 'production') {
    ctx.status = 400;
  }

  // mongoose validation error
  if (err.name == 'ValidationError') {
    ctx.status = 400;

    if (preferredType == 'json') {
      let errors = {};

      for (let field in err.errors) {
        errors[field] = err.errors[field].message;
      }

      ctx.body = {
        errors: errors
      };
    } else {
      ctx.body = ctx.render(`${__dirname}/templates/400.pug`, {
        useAbsoluteTemplatePath: true,
        error: err
      });
    }

    return;
  }

  if (isDevelopment) {
    ctx.status = err.status || 500;

    let stack = (err.stack || '')
      .split('\n').slice(1)
      .map(function(v) {
        return '<li>' + escapeHtml(v).replace(/  /g, ' &nbsp;') + '</li>';
      }).join('');

    if (preferredType == 'json') {
      ctx.body = {
        message: err.message,
        stack: stack
      };

    if (err.description) {
      ctx.body.description = err.description;
    }
    if (err.info) {
      ctx.body.info = err.info;
    }
      ctx.body.statusCode = err.statusCode || err.status;
    } else {
      ctx.type = 'text/html; charset=utf-8';
      ctx.body = "<html><body><h1>" + escapeHtml(err.message) + "</h1><ul>" + stack + "</ul></body></html>";
    }

    return;
  }

  ctx.status = +err.status || 500;

  if (preferredType == 'json') {
    ctx.body = {
      message: err.message,
      statusCode: err.status || err.statusCode
    };
    if (err.description) {
      ctx.body.description = err.description;
    }
    if (err.info) {
      ctx.body.info = err.info;
    }
  } else {
    let templateName = [503, 500, 400, 401, 404, 403].includes(ctx.status) ? ctx.status : 500;
    ctx.body = ctx.render(`${__dirname}/templates/${templateName}.pug`, {
      useAbsoluteTemplatePath: true,
      error: err,
      supportEmail: config.supportEmail,
      requestId: ctx.requestId,
      t
    });
  }

}


exports.init = function(app) {

  app.use(async function(ctx, next) {
    ctx.renderError = err => renderError(ctx, err);

    try {
      await next();
    } catch (err) {
      if (typeof err !== 'object') { // 'fx error' from money or mb another module
        err = new Error(err);
      }
      // ctx middleware is not like others, it is not endpoint
      // so wrapHmvcMiddleware is of little use
      try {
        renderError(ctx, err);
      } catch(renderErr) {
        // could not render, maybe template not found or something
        ctx.status = 500;
        ctx.body = "Server render error";
        ctx.log.error(renderErr); // make it last to ensure that status/body are set
      }

    }
  });


};
