let config = require('config');
let log = require('engine/log')();
let request = require('request-promise');
const assert = require('assert');

module.exports = async function getPlunkerToken() {
  // require here, not need to install these in server
  const puppeteer = require('puppeteer');

  const browser = await puppeteer.launch({
    // todo: run not from root
    // remove this
    args: ['--no-sandbox'],
    headless: false,
    devtools: false,
    // slowMo: 300,
    //executablePath: getChromeLocation()
  });

  const page = await browser.newPage();

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
  await submitElem.click();

  let result = await new Promise((resolve, reject) => {
    page.on('response', response => {
      console.log("RESPONSE", response.url());
      if (response.url() == 'https://api.plnkr.co/v2/auth/token') {
        response.json().then(resolve, reject);
      }
    });
  });

  console.log("RESULT!!", result);

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
};
