const chai = require('chai');
//let server = require('./server.js');
//let cp = require('child_process');
const deployIndex = require('../deploy/index.js');
const SpotinstObj = require('./utils/SpotinstServerlessObject');

const options = {
  stage: 'dev',
  region: 'myTestRegion'
};

let testObject = new SpotinstObj();

let deployObject = new deployIndex(testObject, options);

const testConfig = { runtime: 'nodejs8.3',
  handler: 'handler.main',
  memory: 128,
  timeout: 30,
  access: 'public',
  events: [],
  name: 'Test-Function',
  package: {} };

beforeEach(() => {
  const Serverless = require('../test/node_modules/serverless')
});


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




describe('HTTP Server Test', function() {
  // The function passed to before() is called before running the test cases.
  before(function() {
    server.listen(8989);
  });

  // The function passed to after() is called after running the test cases.
  after(function() {
    server.close();
  });

  describe('/', function() {
    it('should be Hello, Mocha!', function(done) {
      http.get('http://127.0.0.1:8989', function(response) {
        // Assert the status code.
        assert.equal(response.statusCode, 200);

        let body = '';
        response.on('data', function(d) {
          body += d;
        });
        response.on('end', function() {
          // Let's wait until we read the response, and then assert the body
          // is 'Hello, Mocha!'.
          assert.equal(body, 'Hello, Mocha!');
          done();
        });
      });
    });
  });
});