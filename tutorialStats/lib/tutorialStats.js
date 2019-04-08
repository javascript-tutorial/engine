const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');
const config = require('config');
const log = require('jsengine/log')();

const statsPath = path.join(config.tmpRoot, 'tutorialStats.json');

module.exports = class TutorialStats {

  static instance() {
    if (!this._instance) {
      this._instance = new TutorialStats();
      this._instance.read();
    }
    return this._instance;
  }

  // can be called from CRON
  async update() {
    let supportedLangs = config.supportedLangs.map(lang => lang.code);
    supportedLangs = supportedLangs.join(',');
    try {
      const translateUri = `${config.statsServiceUrl}/translate?langs=${supportedLangs}`;
      log.debug('Translation Stats update start', translateUri);
      this.translate = await request({uri: translateUri, json: true});

      const contributorsUri = `${config.statsServiceUrl}/contributors?lang=${config.lang}`;
      log.debug('Contributors update start', contributorsUri);
      this.contributors = await request({uri: contributorsUri, json: true});
    } catch(e) {
      if (config.env === 'development') {
        log.debug("Tutorial stats update error", e);
        return;
      } else {
        throw e;
      }
    }
    await this.write();
    log.debug('Translation Stats is updated');
  }

  async write() {
    await fs.outputJson(statsPath, {translate: this.translate, contributors: this.contributors});
  }

  read() {
    let stats = fs.existsSync(statsPath) ? fs.readJsonSync(statsPath) : {
      translate: {},
      contributors: {}
    };
    this.translate = stats.translate;
    this.contributors = stats.contributors;
  }

  getLinksBy(url) {
    let linksByLang = {};

    //let supportedLang = config.supportedLangs.find(lang => lang.code === config.lang);

    // console.log(this.stats);
    for(let supportedLang of config.supportedLangs) {
      let stats = this.translate[supportedLang.code];

      let translatedUrl;

      if (supportedLang.pages.find(pageReg => pageReg.test(url)))  {
        translatedUrl = url;
      } else if (stats && stats.translated.includes(url)) {
        translatedUrl = url;
      } else {
        translatedUrl = '/';
      }

      // console.log("translated url", url, supportedLang.code, translatedUrl);
      linksByLang[supportedLang.code] = this.buildLink(supportedLang.code, translatedUrl);
    }

    return linksByLang;
  }

  // returns null is no stats
  isTranslated(url) {
    if (config.lang === 'en') return true;

    let stats = this.translate[config.lang];

    return stats ? stats.translated.includes(url) : null;
  }

  getMaterialLangs(url) {
    let translatedLangs = [];
    for (let supportedLang of config.supportedLangs) {
      let stats = this.translate[supportedLang.code];
      if (supportedLang.pages.find(pageReg => pageReg.test(url)) || (stats && stats.translated.includes(url))) {
        translatedLangs.push({
          url: this.buildLink(supportedLang.code, url),
          title: supportedLang.title
        });
      }
    }
    return translatedLangs.map(lang => `<a href="${lang.url}">${lang.title}</a>`).join(", ");
  }

  getLangsCtxBy(url) {
    const links = this.getLinksBy(url);
    const result = config.supportedLangs.map(lang => {
      let { progress } = this.translate[lang.code] || {};
      let link = links[lang.code];
      return { ...lang, progress, link };
    });
    return result;
  }

  buildLink(lang, originalUrl) {
    const { domain } = this.getLangByCode(lang);
    return `https://${domain}${originalUrl}`;
  }

  getLangByCode(lang) {
    return config.supportedLangs.filter(l => l.code === lang).pop();
  }

  getLangStats(lang) {
    const langData = config.supportedLangs.filter(l => l.code === lang).pop();
    const { progress } = this.translate[lang] || {};
    return { ...langData, progress };
  }
};

function removeEngIn(langs) {
  const idx = langs.indexOf('en');
  if (idx > -1) {
    langs.splice(idx, 1);
  }
  return langs;
}
