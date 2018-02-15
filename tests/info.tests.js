const chai = require('chai');
const InfoObject = require('../info/index.js');
const Serverless = require('serverless');
const config = require('../config.js');

const serverless = new Serverless();
const infoObject = new InfoObject(serverless, { stage: 'dev', region: "here" })

// describe a test group
describe("info/index.js tests", () => {
  // describe a specific test
  it('init() test', (done) => {
  	console.log(config.providerName)
  	console.log(infoObject.info())    
    
    done();
  });
});
