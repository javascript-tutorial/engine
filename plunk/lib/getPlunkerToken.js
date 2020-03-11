let config = require('config');
let log = require('engine/log')();
const assert = require('assert');
const PlunkSession = require('../models/plunkSession');

module.exports = async function getPlunkerToken({refresh = false} = {}) {
  let session;

  if (!process.env.PLNKR_ENABLED) {
    return '';
  }

  log.debug("Get plunker token");

  if (!refresh) {
    log.debug("Get plunker token from db");
    session = await PlunkSession.findOne({});
  }

  if (!session) {
    log.debug('Get new plunk token');
    await PlunkSession.remove({});
    const token = await fetchPlunkSessionId();
    session = await PlunkSession.create({
      token,
      expires:   new Date(Date.now() + 86400 * 1e3), // expires in 1 day
      createdAt: new Date()
    });
  }

  return session.token;
};

async function fetchPlunkSessionId() {

  // require here, not need to install these in server
  // const puppeteer = require('puppeteer');
  const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
  const StealthPlugin = require('puppeteer-extra-plugin-stealth')
  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch({
    // todo: run not from root
    // remove this
    // args:     ['--no-sandbox'],
    headless: false,
    dumpio: true
    // devtools: false,
    // slowMo: 300,
    //executablePath: getChromeLocation()
  });

  browser.on('targetdestroyed', target => {
    console.log("DESTROY", target.url());
  });

  const page = await browser.newPage();

  // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36');

  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (
      ['image', 'font'].includes(request.resourceType()) ||
      request.url().endsWith('.ico') ||
      request.url().includes('/trending?') ||
      !request.url().match(/plnkr|github|ajax.googleapis.com/)
    ) {
      log.debug("aborted", request.resourceType(), request.url());
      request.abort();
    } else {
      log.debug("loaded", request.url());

      request.continue();
    }
  });

  await page.goto('https://plnkr.co/');

  /*
  // return anon session
  let token = await page.evaluate(() => document.cookie.match(/plnkr.access_token=([\w.]+)/)[1]);
  await browser.close();
  return token;
  */

  // The code below is unfinished
  // may not work well because of github device verification


  log.debug("wait for login button");
  await page.waitForSelector('button.plunker-toolbar-login');

  log.debug("Pages: ", (await browser.pages()).length);

  await new Promise(r => setTimeout(r, 1000));

  const loginButton = await page.$('button.plunker-toolbar-login');

  await loginButton.click();

  await page.waitForSelector('.auth-service-icon.fa-github');

  const githubAuthButton = await page.$('.auth-service-icon.fa-github');

  const nav = new Promise(res => browser.on('targetcreated', res));

  githubAuthButton.click();

  log.debug("PLNKR LOGIN CLICKED");

  await nav;

  let pages = await browser.pages();

  log.debug("Pages", pages.map(page => page.url()));

  let githubPage = pages[pages.length - 1];

  await githubPage.waitForSelector('#login_field');
  // await githubPage.waitForNavigation({waitUntil: 'networkidle0'});

  assert(githubPage);

  // await page.goto('https://github.com/login?client_id=7e377e5657c4d5c332db&return_to=%2Flogin%2Foauth%2Fauthorize%3Fclient_id%3D7e377e5657c4d5c332db%26redirect_uri%3Dhttps%253A%252F%252Fplnkr.co%252Fauth%252Fgithub%26scope%3Dgist%26state%3D');

  await githubPage.type('#login_field', config.plnkr.login);
  await githubPage.type('#password', config.plnkr.pass);

  const submitElem = await githubPage.$('input[type=submit]');

  let tokenPromise = new Promise((resolve, reject) => {
    page.on('response', response => {
      // console.log("RESPONSE", response.url());
      if (response.url() == 'https://api.plnkr.co/v2/auth/token') {
        response.text().then(resolve, reject);
      }
    });
  });

  await submitElem.click();

  let result = await tokenPromise;

  console.log("RESULT!!", result);

  result = JSON.parse(result); // split to see where the error happens

  await browser.close();

  return result.access_token;
  /*
    pages = await browser.pages();

    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log("PAGES", pages.map(page => page.url()), pages[1] === page);

    // I'll click on github login, and AFTER THAT we'll wait till plunker created session on server for that user
    page.waitForResponse(response => response.url().match(/api.plnkr.co\/v2\/auth\/token/));

    // console.log("HERE", page);
    let token = await page.evaluate(() => document.cookie.match(/plnkr.access_token=([\w.]+)/)[1]);


    console.log("DONE", token);

   */

}
