'use strict';

const moment = require('momentWithLocale');
const util = require('util');
const path = require('path');
const config = require('config');
const fs = require('fs');
const log = require('@jsengine/log')();
const pug = require('serverPug');
const t = require('@jsengine/i18n');
const url = require('url');
const BasicParser = require('markit').BasicParser;


function addStandardHelpers(locals, ctx) {
  // same locals may be rendered many times, let's not add helpers twice
  if (locals._hasStandardHelpers) return;

  locals.moment = moment;

  locals.lang = config.lang;

  locals.url = url.parse(ctx.protocol + '://' + ctx.host + ctx.originalUrl);
  locals.context = ctx;

  locals.livereloadEnabled = true;

  locals.js = function(name, options) {
    options = options || {};

    let src = locals.pack(name, 'js');

    let attrs = options.defer ? ' defer' : '';

    return `<script src="${src}"${attrs}></script>`;
  };


  locals.css = function(name) {
    let src = locals.pack(name, 'css');

    return `<link href="${src}" rel="stylesheet">`;
  };

  locals.env = process.env;

  locals.urlBase = config.urlBase;

  // replace lone surrogates in json, </script> -> <\/script>
  locals.escapeJSON = function(s) {
    let json = JSON.stringify(s);
    return json.replace(/\//g, '\\/')
      .replace(/[\u003c\u003e]/g,
        function(c) {
          return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4).toUpperCase();
        }
      ).replace(/[\u007f-\uffff]/g,
        function(c) {
          return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
        }
      );
  };

  locals.markit = function(text, options) {
    return new BasicParser(options).render(text);
  };

  locals.markitInline = function(text, options) {
    return new BasicParser(options).renderInline(text);
  };

  locals.t = t;
  //locals.bem = require('bemPug')();

  locals.pack = function(name, ext) {
    let versions = JSON.parse(
      fs.readFileSync(path.join(config.cacheRoot, 'webpack.versions.json'), {encoding: 'utf-8'})
    );
    let versionName = versions[name];
    // e.g style = [ style.js, style.js.map, style.css, style.css.map ]

    if (!Array.isArray(versionName)) return versionName;

    let extTestReg = new RegExp(`.${ext}\\b`);

    // select right .js\b extension from files
    for (let i = 0; i < versionName.length; i++) {
      let versionNameItem = versionName[i]; // e.g. style.css.map
      if (/\.map/.test(versionNameItem)) continue; // we never need a map
      if (extTestReg.test(versionNameItem)) return versionNameItem;
    }

    throw new Error(`Not found pack name:${name} ext:${ext}`);
  };


  locals._hasStandardHelpers = true;
}


// (!) this.render does not assign this.body to the result
// that's because render can be used for different purposes, e.g to send emails
exports.init = function(app) {
  app.use(async function(ctx, next) {

    ctx.locals = Object.assign({}, config.pug);

    /**
     * Render template
     * Find the file:
     *   if locals.useAbsoluteTemplatePath => use templatePath
     *   else if templatePath starts with /   => lookup in locals.basedir
     *   otherwise => lookup in ctx.templateDir (MW should set it)
     * @param templatePath file to find (see the logic above)
     * @param locals
     * @returns {String}
     */
    ctx.render = function(templatePath, locals) {

      // add helpers at render time, not when middleware is used time
      // probably we will have more stuff initialized here
      addStandardHelpers(ctx.locals, ctx);

      // warning!
      // Object.assign does NOT copy defineProperty
      // so I use ctx.locals as a root and merge all props in it, instead of cloning ctx.locals
      let loc = Object.create(ctx.locals);

      Object.assign(loc, locals);

      if (!loc.schema) {
        loc.schema = {};
      }

      if (!loc.canonicalPath) {
        // strip query
        loc.canonicalPath = ctx.request.originalUrl.replace(/\?.*/, '');
        // /intro/   -> /intro
        loc.canonicalPath = loc.canonicalPath.replace(/\/+$/, '');
      }

      loc.canonicalUrl = config.urlBase.main + loc.canonicalPath;

      if (ctx.templateDir) {
        loc.roots = [ctx.templateDir];
      }

      if (loc.sitetoolbar === undefined) {
        loc.sitetoolbar = true;
      }

      loc.plugins = [{
        resolve: pug.pugResolve
      }];

      log.debug("render template", templatePath);

      return pug.renderFile(pug.pugResolve(templatePath, null, loc), loc);
    };


    await next();
  });

};
