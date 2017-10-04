"use strict";

const config = require("../config");
const chalk = require('chalk');
const path = require('path');
const utils = require("lodash");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class SpotinstRemove extends LocalFunctionsMapper {
	constructor(serverless, options){
		super();

		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._localFuncs = {};

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'before:remove:remove': _ => this.init(),
			'remove:remove': _ => this.remove()
		}
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client.FunctionsService;

		return Promise.resolve();
	}

	remove(){
		let calls = [];
		this._localFuncs = this.getLocalFunctions();

		this.serverless.cli.consoleLog(`${chalk.yellow.underline('Removing functions:')}`);

		utils.forEach(this._localFuncs, func => {
			const params = utils.extend({id: func.id}, this.provider.defaultParams);
			const call = this._client
				.delete(params)
				.then(res => this.success(res, func))
				.catch(err => this.error(err, func));

			calls.push(call);
		});

		return Promise.all(calls)
			.then( _ => this.updateLocalFunctions(this._localFuncs));
	}

	success(res, func){
		this.serverless.cli.consoleLog(`${func.name}: success`);
		delete this._localFuncs[func.name];
		return res;
	}

	error(err, func){
		this.serverless.cli.consoleLog(`${func.name}: failed with error: ${err}`);
		return null;
	}
}

module.exports = SpotinstRemove;