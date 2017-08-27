"use strict";

const config = require("../config");
const chalk = require('chalk');

class SpotinstLogs {
	constructor(serverless, options){
		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._client = this.provider.client;

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'before:logs:logs': _ => this.init(),
			'logs:logs': _ => this.logs()
		}
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client;

		return Promise.resolve();
	}

	logs(){
		this.serverless.cli.consoleLog(chalk.yellow("Coming soon!"));
		return Promise.resolve();
	}
}

module.exports = SpotinstLogs;