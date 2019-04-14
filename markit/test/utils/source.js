let extractHighlight = require('../../utils/source/extractHighlight');
let stripIndents = require('engine/text-utils/stripIndents');

let fs = require('fs');
let path = require('path');

function readIn(name) {
  return fs.readFileSync(path.join(__dirname, 'source/in', name), 'utf-8');
}
function readOut(name) {
  return fs.readFileSync(path.join(__dirname, 'source/out', name), 'utf-8');
}

describe("source", function() {

  describe("stripIndents", function() {

    beforeEach(function() {
      this.currentTest.in = readIn(this.currentTest.title);
      this.currentTest.result = stripIndents(this.currentTest.in);
      this.currentTest.out = readOut(this.currentTest.title);
    });

    it("indented.txt", function() {
      this.test.result.should.be.eql(this.test.out);
    });
  });

  describe("extractHighlight", function() {

    beforeEach(function() {
      this.currentTest.in = readIn(this.currentTest.title);
      this.currentTest.result = extractHighlight(this.currentTest.in);
      this.currentTest.out = readOut(this.currentTest.title);
    });


    it("block-whole.txt", function() {
      this.test.result.highlight.should.eql([ { start: 0, end: 1 } ]);
      this.test.result.text.should.be.eql(this.test.out);
    });

    it("block-one-line.txt", function() {
      this.test.result.highlight.should.eql([ { start: 0, end: 0 } ]);
      this.test.result.text.should.be.eql(this.test.out);
    });

    it("single-line.txt", function() {
      this.test.result.highlight.should.eql([ { start: 1, end: 1 } ]);
      this.test.result.text.should.be.eql(this.test.out);
    });

    it("blocks-two.txt", function() {
      this.test.result.highlight.should.eql([ {start: 4, end: 4} , { start: 1, end: 2 }]);
      this.test.result.text.should.be.eql(this.test.out);
    });


    it("inline.txt", function() {
      this.test.result.highlight.should.eql([ { start: 0, cols: [{start:8, end: 18}] }]);
      this.test.result.text.should.be.eql(this.test.out);
    });

    it("inline-multi.txt", function() {
      this.test.result.highlight.should.eql([
        { start: 1, cols: [{start:8, end: 9}, {start: 18, end: 19}] },
        { start: 0, cols: [{start:8, end: 18}] }
      ]);
      this.test.result.text.should.be.eql(this.test.out);
    });

    it("mixed.txt", function() {
      this.test.result.highlight.should.eql([
        { start: 3, cols: [{start:8, end: 9}] },
        { start: 2, end: 4 },
        { start: 2, cols: [{start:8, end: 18}] }
      ]);

      // this.test.result.inline.should.be.eql('2:8-18,3:8-9');
      // this.test.result.block.should.be.eql('2-4');
      this.test.result.text.should.be.eql(this.test.out);
    });


    it("big.txt", function() {

      this.test.result.highlight.should.eql([
        { start: 23, end: 24 },
        { start: 13, end: 13 },
        { start: 10, cols: [{start:13, end: 26}] },
        { start: 9, cols: [{start:26, end: 37}] },
      ]);

      // this.test.result.inline.should.be.eql('9:26-37,10:13-26');
      // this.test.result.block.should.be.eql('13-13,23-24');
      this.test.result.text.should.be.eql(this.test.out);
    });


  });

});
