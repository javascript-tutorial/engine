'use strict';

const moment = require('engine/moment-with-locale');
const util = require('util');
const path = require('path');
const config = require('config');
const fs = require('fs');
const glob = require('glob');
const log = require('engine/log')();
const pug = require('engine/server-pug');
const t = require('engine/i18n');
const url = require('url');
const BasicParser = require('engine/markit').BasicParser;

let addedFlag = Symbol("engine-koa-helpers");

module.exports = class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    if (!ctx.locals) {
      ctx.locals = Object.assign({}, config.pug);
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

  readVersions() {
    if (this.versions && process.env.mode == 'production') {
      return;
    }

    this.versions = {};

    if (fs.existsSync(path.join(config.cacheRoot, 'webpack.versions.json'))) {
      // this file was used before webpack split build
      // remove this after full update of webpack
      this.versions = JSON.parse(
        fs.readFileSync(path.join(config.cacheRoot, 'webpack.versions.json'), {encoding: 'utf-8'})
      );
    }

    let dir = path.join(config.cacheRoot, 'webpack', 'versions');
    let files = glob.sync('*', {cwd: dir});

    for(let file of files) {
      let versions = JSON.parse( fs.readFileSync(path.join(dir, file), {encoding: 'utf-8'}) );
      Object.assign(this.versions, versions);
    }
    // console.log("PACK VERSIONS", this.versions);
  }

  pack(name, ext) {
    this.readVersions();
    
    let versionName = this.versions[name];
    // e.g style = [ style.js, style.js.map, style.css, style.css.map ]

    if (!Array.isArray(versionName)) {
      return versionName;
    }

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
    locals.langFull = config.langFull;

    locals.url = url.parse(ctx.protocol + '://' + ctx.host + ctx.originalUrl);
    locals.context = ctx;

    locals.js = this.js.bind(this);

    locals.css = this.css.bind(this);

    locals.env = config.env;

    locals.urlBase = config.urlBase;
    locals.urlBaseProduction = config.urlBaseProduction;

    // replace lone surrogates in json, </script> -> <\/script>
    locals.escapeJSON = this.escapeJSON;

    locals.markit = function(text = '', options) {
      return new BasicParser(options).render(text);
    };

    locals.markitInline = function(text, options) {
      return new BasicParser(options).renderInline(text);
    };

    locals.t = t;

    locals.moduleExists = function(name) {
      try {
        require.resolve(name);
        return true;
      } catch(err) {
        return false;
      }
    };


    locals.handlerExists = function(name) {
      return Boolean(config.handlers[name]);
    };

    locals.pack = this.pack.bind(this);


    if (!locals.schema) {
      locals.schema = {};
    }

    if (!locals.canonicalPath) {
      // strip query
      locals.canonicalPath = ctx.request.originalUrl.replace(/\?.*/, '');
      // /intro/   -> /intro
      locals.canonicalPath = locals.canonicalPath.replace(/\/+$/, '');
    }

    locals.canonicalUrl = new URL(locals.canonicalPath, config.urlBase.main).href;

    if (ctx.templateDir) {
      locals.roots = [ctx.templateDir];
    }

    if (locals.sitetoolbar === undefined) {
      locals.sitetoolbar = true;
    }

    locals.localizeNumber = function(num) {
      // 1 -> 一, 2 -> 二
      // nu: numeration system,
      // hanidec: chinese
      return ['zh','ja'].includes(config.lang) ? new Intl.NumberFormat("zh-Hans-CN-u-nu-hanidec").format(num) : num;
    };

    locals.plugins = [{
      resolve: pug.pugResolve
    }];

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

    ctx.log.debug("render template", templatePath);

    return pug.renderFile(pug.pugResolve(templatePath, null, loc), loc);
  }
};
