const config = require('config');

const lang = config.lang;

let moment = require('moment');

if (lang === 'ru') {
  require('moment/locale/ru');

  moment.updateLocale('ru', {
    monthsShort: {
      // по CLDR именно "июл." и "июн.", но какой смысл менять букву на точку ?
      format: 'янв_февр_мар_апр_мая_июня_июля_авг_сент_окт_нояб_дек'.split('_'),
      standalone: 'янв_февр_март_апр_май_июнь_июль_авг_сент_окт_нояб_дек'.split('_')
    }
  });

} else {
  require('moment/locale/' + lang);
}


module.exports = moment;
