const config = require('config');

const lang = config.lang;

let moment = require('moment');

if (lang === 'ru') {
  require('moment/locale/ru');

  moment.updateLocale('ru', {
    monthsShort: {
      // по CLDR именно "июл." и "июн.", но какой смысл менять букву на точку ?
      format: 'янв_фев_мар_апр_мая_июня_июля_авг_сен_окт_ноя_дек'.split('_'),
      standalone: 'янв_фев_мар_апр_май_июнь_июль_авг_сен_окт_ноя_дек'.split('_')
    }
  });

} else if (lang === 'zh') {
  require('moment/locale/zh-cn');
} else if (lang !== 'en') { // for "en" no need to require, it's built-in (require would fail)
  require('moment/locale/' + lang);
}


module.exports = moment;
