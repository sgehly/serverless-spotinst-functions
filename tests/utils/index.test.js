const testUtils = require('./index');
const BbPromise = require('bluebird');
const expect =    require('chai').expect;


describe('SpotinstPlugin', () => {
  it('should create a new SpotinstPlugin mock instance', () => {
    const SpotinstPlugin = testUtils.SpotinstPlugin;
    const serverless = new Serverless();
    const options = {
      stage: 'production',
      region: 'my-test-region',
    };
    const functionUnderTest = () => BbPromise.resolve('function under test');
    const spotinstPlugin = new SpotinstPlugin(
      serverless,
      options,
      functionUnderTest
    );
    expect(spotinstPlugin.serverless).to.be.instanceof(Serverless);
    expect(spotinstPlugin.options).to.deep.equal(options);
  });
});
