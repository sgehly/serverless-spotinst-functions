'use strict';

const expect = require('chai').expect;
const assert = require('chai').assert;
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const BbPromise = require('bluebird');
const chalk = require('chalk');
const moment = require('moment');

const DeployFunctionObject = require('../deployFunction/index.js');

require('chai').use(chaiAsPromised);

describe('SpotinstDeployFunction', () => {
  let sandbox

  const serverless = {classes:{Error:()=>{}}, service:{functions:{"fx-12345":{}, "fx-67890":{}}}, pluginManager:{getPlugins:()=>{return({find:()=>{return({packageService:()=>{}})}})}}, getProvider:()=>{}};

  const options = {
    stage: 'dev',
    region: 'us-east-1',
  };

  const spotinstDeployF = new DeployFunctionObject(serverless, options);
  spotinstDeployF.provider = {loadLocalParamsFile: () => {}, client: {FunctionsService:{read:()=>{}}, SpectrumService:{Events:{read:()=>{}}}, EndpointService:{Pattern:{list:()=>{}}} }};

  describe('#constructor()', () => {
  	it('should set pkg', ()=>{expect(spotinstDeployF.pkg).to.be.not.empty})
  	it('should set infoObject', ()=>{expect(spotinstDeployF.infoObject).to.be.not.empty})
  });

  describe('#setHooks()', ()=>{
  	it('should set hooks', ()=>{expect(spotinstDeployF.hooks).to.be.not.empty}) 
  });

  describe('#init()', ()=>{
  	sandbox = sinon.sandbox.create();
  	it('should return a promise', ()=>{
    	spotinstDeployF.infoObject.init = sandbox.stub(spotinstDeployF.infoObject, 'init')
    	return expect(spotinstDeployF.init()).to.be.a('promise')
  	})
  	it('should initialize the infoObject', ()=>{
  		return expect(spotinstDeployF.infoObject).to.be.not.empty
    	sandbox.restore();
  	})
  })

  describe('#deployFunction()',()=>{
  	it('should throw error if function is not in service', ()=>{
  		sandbox = sinon.sandbox.create();
  		serverless.classes.Error = sandbox.stub(serverless.classes, "Error").returns(Error("Serverless Error"))
  		assert.throws(()=> {spotinstDeployF.deployFunction()}, Error,`Serverless Error`);
  		sandbox.restore()
  	})
  	it('should call info after deploy',()=>{
  		options.function = 'fx-12345'
  		spotinstDeployF.deploy = sandbox.stub(spotinstDeployF, "deploy").returns((Promise.resolve()))
  		const info = sandbox.stub(spotinstDeployF.infoObject, "info")

  		spotinstDeployF.deploy().then(()=>{
  			expect(info.calledOnce).to.be.equal(true)
  		})
  	})
  })
})