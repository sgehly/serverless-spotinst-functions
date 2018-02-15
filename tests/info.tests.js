const chai = require('chai');
const InfoObject = require('../info/index.js');
const Serverless = require('serverless');
const config = require('../config.js');
const IndexObject = require('../index.js');

const serverless = new Serverless({"servicePath":"test"});

const indexObject = new IndexObject(serverless, { stage: 'dev', region: "here" })


// const infoObject = new InfoObject(serverless, { stage: 'dev', region: "here" })

// describe a test group
describe("info/index.js tests", () => {
  // describe a specific test
  it('init() test', (done) => {

	console.log(serverless.pluginManager.addPlugin(InfoObject));
  	// console.log(indexObject)

  	// console.log(config.providerName)
  	// console.log(infoObject.provider)
  	// console.log(infoObject.serverless)
  	// console.log(infoObject.info())    
    
    done();
  });
});
