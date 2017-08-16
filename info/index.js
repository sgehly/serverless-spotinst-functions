"use strict";

const config = require("../config");
const chalk = require('chalk');

class SpotinstInfo {
	constructor(serverless, options){
		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._client = this.provider.client;

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'info:info': _ => this.info()
		}
	}

	info(){
		return this._client
			.list(this.provider.defaultParams)
			.then( funcs => this.displayFunctions(funcs));
	}

	displayFunctions(funcs){
		let messages = [];

		messages.push(`${chalk.yellow.underline('Service Information')}`);
		messages.push(`${chalk.yellow('service:')} ${this.serverless.service.service}`);

		if(funcs.length > 0)
			messages.push(`${chalk.yellow('functions:')}`);
		else
			messages.push(`${chalk.yellow('No Functions Available')}`);

		funcs.forEach(func => messages.push(this.logFunction(func)));

		this.serverless.cli.consoleLog(messages.join("\n"));
	}

	logFunction(func){
		let message = [];

		message.push(`  ${func.name}`);
		message.push(`    current_version: ${func.latestVersion}`);
		message.push(`    url: ${func.url}`);
		message.push(`    runtime: ${func.runtime}`);
		message.push(`    memory: ${func.limits.memory}`);
		message.push(`    timeout: ${func.limits.timeout}`);
		message.push(`    created_at: ${func.createdAt}`);

		return message.join("\n");
	}
}

module.exports = SpotinstInfo;