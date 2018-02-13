"use strict";

const config = require("../config");
const chalk = require('chalk');
const utils = require("lodash");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class SpotinstLogs extends LocalFunctionsMapper {
	constructor(serverless, options){
		super();

		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);

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
		this._client = this.provider.client.FunctionsService;

		return Promise.resolve();
	}
 
	logs(){
		let localFuncs = this.getLocalFunctions();

		this.serverless.cli.consoleLog(chalk.yellow.underline('Function Logs'));
		if(localFuncs[`${this.options.function}-${this.options.stage}`]){
			const selectedFunc = localFuncs[`${this.options.function}-${this.options.stage}`];
			let messages = [];

			let params = this.buildFunctionParams(selectedFunc.name, selectedFunc.id);
			this._client.logs({function:params}).then(res => {
				if(!(res instanceof Array) || res.length === 0){
					messages.push(`No Logs`)

				} else {
					res.forEach(item => {
						messages.push(`Invocation ID: ${item.invocationId}`);
						messages.push(`Log Contents: `);
						let contents = item.content;

						if(contents instanceof Array)
							contents.forEach(content => messages.push(`  [${content.time}]  ${content.log}`));

						messages.push("\n")
					});
				}

				this.serverless.cli.consoleLog(messages.join("\n"))
			});

		} else {
			this.serverless.cli.consoleLog(`    Function Not Found`);
		}
	}

	// Creating the function parameters that are passed onto the SDK to get the logs
	buildFunctionParams(name, id){
		let params = {
			name: name,
			functionId: id
		};

		if(this.options.startTime){
			params.startTime = this.getStartTime(this.options.startTime.toString())
		}
		return utils.extend({}, this.provider.defaultParams, params);
	}

	// Checks the user input for the time entered and creates a new Date object based on their input
	getStartTime(userInput){
		const timeBases = {
			m: 60000,
			h: 3600000,
			d: 86400000
		};

		const unit = userInput.charAt(userInput.length-1).toLowerCase();
		let timeBase = false;
		let time = userInput;

		if(timeBases[unit]){
			timeBase = timeBases[unit];
			time = userInput.substring(0, userInput.length-1);
		}

		time = parseInt(time);
		if(isNaN(time)){
			throw new this.serverless.classes.Error(`Incorrect Time Syntax`);

		} else {
			// If the user gave formatted timeframe
			if(timeBase)
				return new Date(Date.now() - time*timeBase);

			// If the user gave us a specific timestamp
			else
				return new Date(time);
		}
	}
}

module.exports = SpotinstLogs;