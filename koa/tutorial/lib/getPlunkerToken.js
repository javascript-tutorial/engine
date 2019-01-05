let config = require('config');
let log = require('jsengine/log')();
let request = require('request-promise');
const assert = require('assert');

module.exports = async function getPlunkerToken() {
  // require here, not need to instal these in javascript-tutorial-server
  const puppeteer = require('puppeteer');
  const getChromeLocation = require('getChromeLocation');

  const browser = await puppeteer.launch({
    // todo: run not from root
    // remove this
    args: ['--no-sandbox']
    // headless: false,
    // devtools: true,
    // slowMo: 250,
    //executablePath: getChromeLocation()
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);

  let urls = [];
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

      urls.push(request.url());
      request.continue();
    }
  });

  await page.goto('https://plnkr.co/?plnkr=legacy');

  if (page.url().startsWith('http://next.plnkr.co') || page.url().startsWith('https://next.plnkr.co')) {

    log.debug("wait for old plnkr button");
    await page.waitForSelector('[ng-href^="https://plnkr.co"]');
    log.debug("clicked it");
    await page.click('[ng-href^="https://plnkr.co"]');
    // prevent redirects to
    // https://next.plnkr.co/?utm_source=legacy&utm_medium=worker&utm_campaign=next
  }


  // return anon session
  let sid = await page.evaluate(() => window._plunker.session.id);
  await browser.close();
  return sid;


  // The code below authenticates user
  // it doesn't work well

  log.debug("wait for login button");
  await page.waitForSelector('button[ng-click="visitor.login()"]');

  log.debug("Pages: ", (await browser.pages()).length);

  await new Promise(r => setTimeout(r, 1000));

  const loginButton = await page.$('button[ng-click="visitor.login()"]');

  const nav = new Promise(res => browser.on('targetcreated', res));

  await loginButton.click();

  log.debug("PLNKR LOGIN CLICKED");

  await nav;

  let pages = await browser.pages();

  log.debug("Pages", pages.map(page => page.url()));

  let githubPage = pages.find(page => page.url().startsWith('https://github.com/login'));

  assert(githubPage);

  // await page.goto('https://github.com/login?client_id=7e377e5657c4d5c332db&return_to=%2Flogin%2Foauth%2Fauthorize%3Fclient_id%3D7e377e5657c4d5c332db%26redirect_uri%3Dhttps%253A%252F%252Fplnkr.co%252Fauth%252Fgithub%26scope%3Dgist%26state%3D');

  await githubPage.type('#login_field', config.plnkr.login);
  await githubPage.type('#password', config.plnkr.pass);

  let githubPageClose = new Promise(resolve => githubPage.on('close', resolve));

  const submitElem = await githubPage.$('input[type=submit]');
  await submitElem.click();

  // I'll click on github login, and AFTER THAT we'll wait till plunker created session on server for that user
  let waitForResponse = page.waitForResponse(response => response.url().match(/api.plnkr.co\/sessions\/\w+\/user/) && response.status() === 201);

  let isClosed = false;

  try {
    log.debug("WAITING js-oauth-authorize-btn");
    await Promise.race([
      githubPage.waitFor('#js-oauth-authorize-btn:not([disabled])'),
      githubPageClose
    ]);
    isClosed = githubPage.isClosed();
  } catch (e) {
    isClosed = true;
    /* if no authorization needed, gighut popup just closes, may be error */
  }

  if (!isClosed) {

    log.debug("CLICK js-oauth-authorize-btn", await githubPage.evaluate(() => document.querySelector('#js-oauth-authorize-btn').outerHTML));

    await new Promise(r => setTimeout(r, 1000));

    await githubPage.click('#js-oauth-authorize-btn');
    log.debug("CLICKED js-oauth-authorize-btn");
  }


  await page.waitFor(() => !document.querySelector('[ng-click="visitor.login()"]'));

  log.debug("Visitor is logged in");

  await waitForResponse;


  await new Promise(r => setTimeout(r, 3000));

  let sessionId = await page.evaluate(() => window._plunker.session.id);


  log.debug("SID", sessionId);

  log.debug(urls.sort());
  return sessionId;
};
