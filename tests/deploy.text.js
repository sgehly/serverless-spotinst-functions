'use strict';

const expect = require('chai').expect;
const assert = require('chai').assert;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const DeployObject = require('../deploy/index.js');
const BbPromise = require('bluebird');
const chalk = require('chalk');
const moment = require('moment');

require('chai').use(chaiAsPromised);

describe('SpotinstDeploy', () => {
  let sandbox

  const serverless = {classes:{Error:()=>{}}, cli:{consoleLog:()=>{}}, service: {}, getProvider: sinon.spy()};

  const options = {
    stage: 'dev',
    region: 'us-east-1',
  };

  const spotinstDeploy = new DeployObject(serverless, options);
  spotinstDeploy.provider = {defaultParams:{}, loadLocalParamsFile: () => {}, client: {FunctionsService:{read:()=>{}}, SpectrumService:{Events:{read:()=>{}, list:()=>{}}}, EndpointService:{Pattern:{list:()=>{}}} }};

  describe('#constructor()', () => {
    it('should have hooks', () => expect(spotinstDeploy.hooks).to.be.not.empty);
  });

  describe('#init()', () =>{
    sandbox = sinon.sandbox.create();
    it('should have set client', ()=>{
      spotinstDeploy. provider.loadLocalParamsFile = sandbox.stub(spotinstDeploy.provider, 'loadLocalParamsFile');
      spotinstDeploy.init()
      expect(spotinstDeploy._client).to.be.not.empty;
      sandbox.restore();
    })
  });

  describe('#deploy()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should deploy functions', ()=>{
      // console.log(spotinstDeploy._client)
      const funcs = [{name: 'Test1-dev', id:'fx-12345', stage:'dev'}, {name: 'Test2-dev', id:'fx-67890', stage:'dev'}];
      spotinstDeploy.getLocalFunctions = sandbox.stub(spotinstDeploy, 'getLocalFunctions');
      spotinstDeploy.getRemoteFuncs = sandbox.stub(spotinstDeploy, 'getRemoteFuncs').returns(Promise.resolve().then(()=>{return funcs}));

      // const endpointList = sandbox.stub(spotinstDeploy.provider.client.EndpointService.Pattern, 'list').returns(Promise.resolve().then(()=>{return [{functionId:'fx-12345',pattern:'/test1', method:'get'},{functionId:'fx-67890',pattern:'/test2',method:'get'}]}));
      // const cronList = sandbox.stub(spotinstDeploy.provider.client.SpectrumService.Events, 'list').returns(Promise.resolve().then(()=>{return [{isEnabled:'true', cronExpression:'*****'}]}));

      // console.log(spotinstDeploy.provider.client.EndpointService.Pattern)
      // spotinstDeploy._client = spotinstDeploy.provider.client

      // spotinstDeploy._client.EndpointService.Pattern.list = endpointList
      // spotinstDeploy._client.SpectrumService.Events.list = cronList

      // console.log(spotinstDeploy._client.EndpointService.Pattern)
      spotinstDeploy.deploy(funcs);

      sandbox.restore();
    });
  });

});