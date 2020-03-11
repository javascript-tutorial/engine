let config = require('config');
let log = require('engine/log')();
const assert = require('assert');
const request = require('request-promise');

module.exports = async function getPlunkerToken() {

  if (!process.env.PLNKR_ENABLED) {
    return '';
  }

  log.debug("Get plunker token");

  let response = await request({
    url: 'https://api.plnkr.co/v2/oauth/token',
    json: true,
    method: 'POST',
    form: {
      grant_type: 'client_credentials',
      client_id: config.plnkr.credentials.clientId,
      client_secret: config.plnkr.credentials.clientSecret,
      audience: 'plunker-api'
    }
  });

  return response.access_token;
};
