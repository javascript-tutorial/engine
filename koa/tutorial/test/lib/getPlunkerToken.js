const getPlunkerToken = require('../../lib/getPlunkerToken');
const should = require('should');
const request = require('request-promise');

describe("getPlunkerToken", function () {

  it("gets a token", async function () {
    const plunkerToken = await getPlunkerToken();
    should.exist(plunkerToken);

    /*
    const remoteSession = await request({
      url: "http://api.plnkr.co/sessions/" + plunkerToken,
      json: true
    });

    should.exist(remoteSession.auth);
    should.exist(remoteSession.user);
     */
  });

});
