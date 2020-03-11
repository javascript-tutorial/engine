const getPlunkerToken = require('../../lib/getPlunkerToken');
const should = require('should');
const Plunk = require('../../models/plunk');
const request = require('request-promise');

describe("Plunk", function() {

  describe("mergeAndSyncRemote", function() {

    it("can create new plunk", async function() {

      const plunkerToken = await getPlunkerToken();

      let slug = '/tmp-' + Math.random();
      let plunk = new Plunk({
        webPath:     slug,
        description: slug
      });

      let filesForPlunk = [{
        filename: 'index.html',
        content:  'v1'
      }];

      await plunk.mergeAndSyncRemote(filesForPlunk, plunkerToken);

      let plunkFromServer = await request({
        url:  `https://api.plnkr.co/v2/plunks/${plunk.plunkId}`,
        json: true
      });

      should.exist(plunkFromServer.user);

    });

    it("can update a plunk", async function() {

      const plunkerToken = await getPlunkerToken();

      let slug = '/tmp-' + Math.random();
      let plunk = new Plunk({
        webPath:     slug,
        description: slug
      });

      let filesForPlunk = [{
        filename: 'index.html',
        content:  'v1'
      }];

      await plunk.mergeAndSyncRemote(filesForPlunk, plunkerToken);

      const newPlunkerToken = await getPlunkerToken();

      filesForPlunk = [{
        filename: 'index.html',
        content:  'v2'
      }];

      await plunk.mergeAndSyncRemote(filesForPlunk, newPlunkerToken);

    });

  });
});
