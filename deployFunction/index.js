"use strict";

const config = require("../config");
const utils = require('lodash');
const Deploy = require("../deploy/index");

class SpotinstDeployFunction extends Deploy {
	constructor(serverless, options){
		super(serverless, options);
	}

	setHooks(){
		this.hooks = {
			'before:deploy:function:deploy': _ => this.init(),
			'deploy:function:deploy': _ => this.deployFunction()
		}
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client.FunctionsService;

		return Promise.resolve();
	}

	deployFunction(){
		let serviceFuncs = utils.cloneDeep(this.serverless.service.functions);

		if(!serviceFuncs[this.options.function]){
			throw new this.serverless.classes.Error(`Function ${this.options.function} does not exist in your serverless.yml`);
		}

		return this.deploy({ [this.options.function] : serviceFuncs[this.options.function]});
	}
}

module.exports = SpotinstDeployFunction;