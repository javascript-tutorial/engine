DEPRECATED NOT USED

const moment = require('@jsengine/moment-with-locale');
const util = require('util');
const path = require('path');
const config = require('config');
const fs = require('fs');
const log = require('@jsengine/log')();
const pug = require('@jsengine/server-pug');
const t = require('@jsengine/i18n');
const url = require('url');
const BasicParser = require('@jsengine/markit').BasicParser;

let addedFlag = Symbol("jsengine-koa-helpers");

module.exports = class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    if (!ctx.locals) {
      ctx.locals = {};
    }
  }

  js(name, options) {
    options = options || {};

    let src = this.pack(name, 'js');

    let attrs = options.defer ? ' defer' : '';

    return `<script src="${src}"${attrs}></script>`;
  }

  css(name, options) {
    let src = this.pack(name, 'css');

    return `<link href="${src}" rel="stylesheet">`;
  }

  escapeJSON(s) {
    let json = JSON.stringify(s);
    return json.replace(/\//g, '\\/')
      .replace(/[\u003c\u003e]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4).toUpperCase())
      .replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
  }

  pack(name, ext) {
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
  }

  addStandardHelpers() {
    let ctx = this.ctx;
    let locals = ctx.locals;

    locals.livereloadEnabled = process.env.TUTORIAL_EDIT;
    
    locals.moment = moment;
  
    locals.lang = config.lang;
  
    locals.url = url.parse(ctx.protocol + '://' + ctx.host + ctx.originalUrl);
    locals.context = ctx;

    locals.js = this.js.bind(this);

    locals.css = this.css.bind(this);

    locals.env = process.env;

    locals.urlBase = config.urlBase.href;

    // replace lone surrogates in json, </script> -> <\/script>
    locals.escapeJSON = this.escapeJSON;

    locals.markit = function(text, options) {
      return new BasicParser(options).render(text);
    };

    locals.markitInline = function(text, options) {
      return new BasicParser(options).renderInline(text);
    };

    locals.t = t;

    locals.pack = this.pack.bind(this);

  }

  render(templatePath, locals) {
    let ctx = this.ctx;

    // same locals may be rendered many times, let's not add helpers twice
    if (!ctx.locals[addedFlag]) {
      // add helpers at render time, not when middleware is used time
      // probably we will have more stuff initialized here
      this.addStandardHelpers();
      ctx.locals[addedFlag] = true;
    }


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

    loc.canonicalUrl = config.urlBase.main.href + loc.canonicalPath;

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
  }

};
