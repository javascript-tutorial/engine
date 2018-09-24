let config = require('config');
let log = require('jsengine/log')();
let request = require('request-promise');

module.exports = async function getPlunkerToken() {
  let j = request.jar();
  
  let response = await request({
    method: 'GET',
    url: 'https://github.com/login?client_id=7e377e5657c4d5c332db&return_to=%2Flogin%2Foauth%2Fauthorize%3Fclient_id%3D7e377e5657c4d5c332db%26redirect_uri%3Dhttps%253A%252F%252Fplnkr.co%252Fauth%252Fgithub%26scope%3Dgist%26state%3D',
    jar: j
  });

  let token = response.match(/ name="authenticity_token"[\s\S]*?value="(.*?)"/);
  if (!token) {
    log.error("Failed to parse plnkr oauth", response);
    throw new Error("Failed to get token from github plnkr oauth page");
  }
  
  token = token[1];

  log.debug("got github token", token);
  
  response = await request({
    method: "POST",
    url: "https://github.com/session",
    followAllRedirects: true,
    form: {
      commit:'Sign in',
      utf8: '"✓"',
      authenticity_token: token,
      login: config.plnkr.login,
      password: config.plnkr.pass
    },
    jar: j
  });

  log.debug("github session response", response);
  
  let redirectToPlnkrUrl = response.match(/url=(https:\/\/plnkr.co\/auth\/github\?code=\w+)/);

  log.debug("redirectToPlnkrUrl", redirectToPlnkrUrl);

  if (!redirectToPlnkrUrl) {
    log.error("Failed to parse plnkr oauth success", response);
    throw new Error("Failed to parse plnkr oauth success");
  }

  redirectToPlnkrUrl = redirectToPlnkrUrl[1];

  response = await request({
    method: "GET",
    url: redirectToPlnkrUrl,
    followAllRedirects: true,
    jar: j
  });

  log.debug("response", response);

  let session = response.match(/root\._plunker\.session = (.*?);/);

  log.debug("session match", session);

  session = session[1];
  session = JSON.parse(session);

  let auth = response.match(/root\._plunker\.auth = (.*?);/);

  log.debug("auth match", auth);

  auth = auth[1];
  auth = JSON.parse(auth);

  log.debug("got plunker auth: ", auth);

  log.debug("cookie jar", j);

  response = await request({
    method: "POST",
    url: "http://api.plnkr.co/sessions/" + session.id + "/user",
    json: true,
    body: {
      service: 'github',
      token: auth.token
    },
    jar: j
  });

  if (!response.auth || !response.user) {
    log.error("getPlunkerToken failed: no auth or user in response", response);
    throw new Error("getPlunkerToken failed: no auth or user in response");
  }

  log.debug("got plunker token:", session.id);
  return session.id;
};
