"use strict";

const config = require("../config");
const chalk = require('chalk');
const path = require('path');
const utils = require("lodash");

class SpotinstInfo {
	constructor(serverless, options){
		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._client = this.provider.client;

		this.setCommands();
		this.setHooks();
	}

	setCommands(){
		// this will be merged with the core config commands
		this.commands = {
			info: {
				lifecycleEvents: [
					'info',
				],
				options: {
					function: {
						usage: 'Function name.',
						shortcut: 'f'
					}
				}
			},
		};
	}

	setHooks(){
		this.hooks = {
			'before:info:info': _ => this.provider.loadLocalParamsFile(),
			'info:info': _ => this.info()
		}
	}

	info(){
		let funcs;

		if(this.options.f){
			funcs = this.getSingleFunction();

		} else {
			funcs = this.getAllFunctions();
		}

		return funcs.then(items => this.logFunctions(items));
	}

	getSingleFunction(){
		const funcs = this.getLocalFunctions();

		if(!funcs[this.options.f])
			throw new this.serverless.classes.Error(`Function '${this.options.f}' doesn't exist in this service.`);

		let params = utils.extend({id: funcs[this.options.f].id}, this.provider.defaultParams);

		return this._client.read(params);
	}

	getAllFunctions(){
		let calls = [];
		const funcs = this.getLocalFunctions();

		utils.forEach(funcs, func => {
			const params = utils.extend({id: func.id}, this.provider.defaultParams);
			const call = this._client
				.read(params)
				.then( items => items[0]);

			calls.push(call);
		});

		return Promise.all(calls)
			.then(funcs => funcs.filter(func => func)); // clear false values
	}

	getLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		return this.serverless.utils.readFileSync(localFilesPath);
	}

	logFunctions(funcs){
		let messages = [];

		messages.push(`${chalk.yellow.underline('Service Information')}`);
		messages.push(`${chalk.yellow('service:')} ${this.serverless.service.service}`);

		if(funcs.length > 0){
			messages.push(`${chalk.yellow('functions:')}`);
			funcs.forEach(func => messages.push(this.logFunction(func)));

		} else
			messages.push(`${chalk.yellow('None')}`);

		this.serverless.cli.consoleLog(messages.join("\n"));
	}

	logFunction(func){
		let message = [];

		message.push(`  ${func.name}`);
		message.push(`    runtime: ${func.runtime}`);

		message.push(`    memory: ${func.limits.memory}`);
		message.push(`    timeout: ${func.limits.timeout}`);
		message.push(`    version: ${func.latestVersion}`);
		message.push(`    url: ${func.url}`);
		message.push(`    created_at: ${func.createdAt}`);

		return message.join("\n");
	}
}

module.exports = SpotinstInfo;