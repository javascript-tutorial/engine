const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');
const config = require('config');
const log = require('jsengine/log')();

const statsPath = path.join(config.tmpRoot, 'translationStats.json');

module.exports = class TranslationStats {

  static instance() {
    if (!this._instance) {
      this._instance = new TranslationStats();
      this._instance.read();
    }
    return this._instance;
  }

  // can be called from CRON
  async update() {
    log.debug('Translation Stats update start');
    let supportedLangs = config.supportedLangs.map(lang => lang.code);
    supportedLangs = supportedLangs.join(',');
    const uri = `${config.translateHook}/stats?langs=${supportedLangs}`;
    this.stats = await request({ uri, json: true });
    await this.write();
    log.debug('Translation Stats is updated');
  }

  async write() {
    await fs.outputJson(statsPath, this.stats);
  }

  read() {
    this.stats = fs.existsSync(statsPath) ? fs.readJsonSync(statsPath) : {};
  }

  getLinksBy(url) {
    let linksByLang = {};

    //let supportedLang = config.supportedLangs.find(lang => lang.code === config.lang);

    // console.log(this.stats);
    for(let supportedLang of config.supportedLangs) {
      let stats = this.stats[supportedLang.code];

      let translatedUrl;

      if (supportedLang.pages.find(pageReg => pageReg.test(url)))  {
        translatedUrl = url;
      } else if (stats && stats.translated.includes(url)) {
        translatedUrl = url;
      } else {
        translatedUrl = '/';
      }

      // console.log("translated url", url, supportedLang.code, translatedUrl);
      linksByLang[supportedLang.code] = buildLink(supportedLang.code, translatedUrl);
    }

    //result.en = isNotAllowedUrl ? buildLink('en', '/') : buildLink('en', url);

    return linksByLang;
  }

  // returns null is no stats
  isTranslated(url) {
    if (config.lang === 'en') return true;
    
    let stats = this.stats[config.lang];

    return stats ? stats.translated.includes(url) : null;
  }

  getLangsCtxBy(url) {
    const links = this.getLinksBy(url);
    const result = config.supportedLangs.map(lang => {
      let { progress } = this.stats[lang.code] || {};
      let link = links[lang.code];
      return { ...lang, progress, link };
    });
    return result;
  }
};

function removeEngIn(langs) {
  const idx = langs.indexOf('en');
  if (idx > -1) {
    langs.splice(idx, 1);
  }
  return langs;
}

function buildLink(lang, originalUrl) {
  const { domain } = config.supportedLangs.filter(l => l.code === lang).pop();
  return `https://${domain}${originalUrl}`;
}
