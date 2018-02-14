const chai = require('chai');
const deployIndex = require('../deploy/index.js');
const SpotinstObj = require('./utils/SpotinstServerlessObject');
const Serverless = require('serverless');



// describe a test group
describe("deploy/index.js tests", () => {
  // describe a specific test
  it('create', (done) => {
    chai.assert.equal(1,1);
    console.log("in the create test");
    let serverless = new Serverless();
    console.log(serverless);
    // will return pass/fail with optional message (can be output to logs if you wanna be like that)
    done();
  });
});
