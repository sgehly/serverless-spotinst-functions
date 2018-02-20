'use strict';

const expect = require('chai').expect;
const assert = require('chai').assert;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const InfoObject = require('../info/index.js');
const BbPromise = require('bluebird');
const chalk = require('chalk');
const moment = require('moment');

require('chai').use(chaiAsPromised);

describe('SpotinstInfo', () => {
  let sandbox

  const serverless = {classes:{Error:()=>{}}, cli:{consoleLog:()=>{}}, service: {}, getProvider: sinon.spy()};

  const options = {
    stage: 'dev',
    region: 'us-east-1',
  };

  const spotinstInfo = new InfoObject(serverless, options);
  spotinstInfo.provider = {loadLocalParamsFile: () => {}, client: {FunctionsService:{read:()=>{}}, SpectrumService:{Events:{read:()=>{}}}, EndpointService:{Pattern:{list:()=>{}}} }};

  describe('#constructor()', () => {
    it('should have hooks', () => expect(spotinstInfo.hooks).to.be.not.empty);
    it('should have commands', () => expect(spotinstInfo.commands).to.be.not.empty);
  });

  describe('#init()', () =>{
    sandbox = sinon.sandbox.create();
    spotinstInfo.provider.loadLocalParamsFile = sandbox.stub(spotinstInfo.provider, 'loadLocalParamsFile');
    
    it('should return Promise',() => expect(spotinstInfo.init()).to.be.a('promise'));
    it('should have client', () => expect(spotinstInfo._client).to.be.not.empty);   
    sandbox.restore();
  });

  describe('#info()', () =>{
    sandbox = sinon.sandbox.create();
    it('should get all functions and run promise chain', ()=>{
      spotinstInfo.getSingleFunction = sandbox.stub(spotinstInfo, 'getSingleFunction').returns(Promise.resolve())
      spotinstInfo.getAllFunctions = sandbox.stub(spotinstInfo, 'getAllFunctions').returns(Promise.resolve())

      let patterns = sandbox.stub(spotinstInfo, 'getEndpointPatterns')
      let crons = sandbox.stub(spotinstInfo, 'getCronJobs')
      let logs = sandbox.stub(spotinstInfo, 'logFunctions')

      return spotinstInfo.info().then(()=>{
        expect(patterns.calledOnce).to.be.equal(true)
        expect(crons.calledOnce).to.be.equal(true)
        expect(logs.calledOnce).to.be.equal(true)

        sandbox.restore();
      });
    })

    it('should get single function and run promise chain', ()=>{
      spotinstInfo.getSingleFunction = sandbox.stub(spotinstInfo, 'getSingleFunction').returns(Promise.resolve())
      spotinstInfo.getAllFunctions = sandbox.stub(spotinstInfo, 'getAllFunctions').returns(Promise.resolve())

      let patterns = sandbox.stub(spotinstInfo, 'getEndpointPatterns')
      let crons = sandbox.stub(spotinstInfo, 'getCronJobs')
      let logs = sandbox.stub(spotinstInfo, 'logFunctions')
      
      spotinstInfo.options.function = "testing"

      return spotinstInfo.info().then(()=>{
        expect(patterns.calledOnce).to.be.equal(true)
        expect(crons.calledOnce).to.be.equal(true)
        expect(logs.calledOnce).to.be.equal(true)

        sandbox.restore();
        delete spotinstInfo.options.function
      });
    })    
  })

  describe('#getSingleFunction()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should get function and make API call', ()=>{
      spotinstInfo.getLocalFunctions = sandbox.stub(spotinstInfo, 'getLocalFunctions').returns({'Test-dev': { id: 'fx-89d870dc'}});
      spotinstInfo._client.read = sandbox.stub(spotinstInfo._client, 'read').returns(Promise.resolve())
      spotinstInfo.options.function = "Test-dev"

      expect(spotinstInfo.getSingleFunction()).to.be.a('promise')
      delete spotinstInfo.options.function
      sandbox.restore();
    })

    it('should get unmatched function then throw error', ()=>{
      spotinstInfo.getLocalFunctions = sandbox.stub(spotinstInfo, 'getLocalFunctions').returns({'Test-dev': { id: 'fx-89d870dc'}});
      spotinstInfo._client.read = sandbox.stub(spotinstInfo._client, 'read').returns(Promise.resolve())
      serverless.classes.Error = sandbox.stub(serverless.classes, "Error").returns(Error("Serverless Error"))

      assert.throws(()=> {spotinstInfo.getSingleFunction()},Error,`Serverless Error`);
      
      sandbox.restore();
    })
  })

  describe('#getAllFunctions()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should get all functions and return list of API calls',()=>{
      spotinstInfo.getLocalFunctions = sandbox.stub(spotinstInfo, 'getLocalFunctions').returns({'Test1-dev':{id:'fx-12345', stage:'dev'}, 'Test2-dev':{id:'fx-67890', stage:'dev'}})
      const read = sandbox.stub(spotinstInfo._client, 'read').returns(Promise.resolve().then(()=>{return [{stage:'dev'}]}))

      return spotinstInfo.getAllFunctions().then(()=>{
        expect(read.callCount).to.be.equal(2)
      })
      sandbox.restore();
    })
  })

  describe('#getCronJobs()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should take in list of functions and return Promises', ()=>{
      spotinstInfo._client = spotinstInfo.provider.client
      const read = sandbox.stub(spotinstInfo._client.SpectrumService.Events, 'read').returns(Promise.resolve().then(()=>{return [{isEnabled:'true', cronExpression:'*****'}]}));
      const items = [{'Test1-dev':{id:'fx-12345', stage:'dev'}}, {'Test2-dev':{id:'fx-67890', stage:'dev'}}];

      return spotinstInfo.getCronJobs(items).then(()=>{
        expect(read.callCount).to.be.equal(2)
      });
      sandbox.restore();
    })
  })

  describe('#getEndpointPatterns()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should take in list of functions and return Promises', ()=>{
      const list = sandbox.stub(spotinstInfo._client.EndpointService.Pattern, 'list').returns(Promise.resolve().then(()=>{return [{functionId:'fx-12345',pattern:'/test1', method:'get'},{functionId:'fx-67890',pattern:'/test2',method:'get'}]}));
      const items = [{name: 'Test1-dev', id:'fx-12345', stage:'dev'}, {name: 'Test2-dev', id:'fx-67890', stage:'dev'}];

      return spotinstInfo.getEndpointPatterns(items).then(()=>{
        expect(list.calledOnce).to.be.equal(true)
      });
      sandbox.restore();      
    })
  })

  describe('#logFunctions()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should take in all the functions and send them to the LogFunction', ()=>{
      const funcs = [{name: 'Test1-dev', id:'fx-12345', stage:'dev', endpoint:{functionId:'fx-12345',pattern:'/test1', method:'get'}, cron:{isEnabled:'true', cronExpression:'*****'}}, {name: 'Test2-dev', id:'fx-67890', stage:'dev', endpoint:{functionId:'fx-67890',pattern:'/test2',method:'get'}, cron:{isEnabled:'true', cronExpression:'*****'}}]
      const log = sandbox.stub(spotinstInfo, 'logFunction');

      spotinstInfo.logFunctions(funcs)

      sandbox.restore();
    })

    it('should take in no functions and return None', ()=>{
      const funcs = []
      spotinstInfo.logFunction = sandbox.stub(spotinstInfo, 'logFunction');

      spotinstInfo.logFunctions(funcs)

      sandbox.restore();
    })
  })

  describe('#logFunction()', ()=>{
    sandbox = sinon.sandbox.create();
    it('should take in one function and log info', ()=>{
      const func = {name: 'Test1-dev', id:'fx-12345', stage:'dev', limits:{memory:128, timeout:30}, endpoint:{functionId:'fx-12345',pattern:'/test1', method:'get'}, cron:{isEnabled:'true', cronExpression:'*****'}}

      expect(spotinstInfo.logFunction(func)).to.be.equal(`  Test1-dev\n    id: fx-12345\n    stage: dev\n    runtime: undefined\n    memory: 128\n    timeout: 30\n    version: undefined\n    url: undefined\n    created_at: undefined\n    cron:\n      active: true\n      value: *****\n    endpoint:\n      path: /test1\n      method: get`) 

      sandbox.restore();
    })
  })

  describe('#logs()', ()=>{
    sandbox = sinon.sandbox.create()
    it('should get a single function and log info', ()=>{
      spotinstInfo.getSingleFunction = sandbox.stub(spotinstInfo, 'getSingleFunction').returns(Promise.resolve().then(()=>[{name:'Test1', id:'fx-12345', latestVersion:'0'}]))

      spotinstInfo.logs()

      sandbox.restore()
    })
  })
});