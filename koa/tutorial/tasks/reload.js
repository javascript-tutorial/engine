let config = require('config');
let request = require('request-promise');

module.exports = function(options) {

  return function() {

    return (async function() {
      let response = await request({
        url: new URL("tutorial/reload", config.urlBase.main).href,
        headers: {
          'X-Admin-Key': config.adminKey
        }
      });

      console.log(response);
    })();
  };
};
