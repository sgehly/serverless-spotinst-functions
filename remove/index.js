"use strict";

const config = require("../config");
const chalk = require('chalk');
const path = require('path');
const utils = require("lodash");

class SpotinstRemove {
	constructor(serverless, options){
		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._client = this.provider.client;
		this._localFuncs = {};

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'before:remove:remove': _ => this.provider.loadLocalParamsFile(),
			'remove:remove': _ => this.remove()
				.then( _ => this.updateLocalFunctions())
		}
	}

	remove(){
		let calls = [];
		this.getLocalFunctions();

		this.serverless.cli.consoleLog(`${chalk.yellow.underline('Removing functions:')}`);

		utils.forEach(this._localFuncs, func => {
			const params = utils.extend({id: func.id}, this.provider.defaultParams);
			const call = this._client
				.delete(params)
				.then(res => this.success(res, func))
				.catch(err => this.error(err, func));

			calls.push(call);
		});

		return Promise.all(calls);
	}

	getLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		this._localFuncs = this.serverless.utils.readFileSync(localFilesPath);
	}

	updateLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		return this.serverless.utils.writeFileSync(localFilesPath, this._localFuncs);
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