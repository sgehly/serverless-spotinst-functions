"use strict";

const config = require("../config");
const chalk = require('chalk');
const utils = require("lodash");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class SpotinstLogs extends LocalFunctionsMapper {
	constructor(serverless, options){
		super()

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
		let serviceFuncs = utils.cloneDeep(this.serverless.service.functions);

		this.serverless.cli.consoleLog(chalk.yellow.underline('Function Logs:'));
		utils.forEach(serviceFuncs, (config, name) => {
			if(localFuncs[this.options.function]){
				let messages = []
				let params = this.buildFunctionParams(name, config, localFuncs);
				this._client.logs({function:params}).then((res)=>{
					if(res.length==0){
						messages.push(`No Logs`)
					}else{
						for(let index in res){
							messages.push(`Invoked: ${res[index].updatedAt} UTC`)
							messages.push(`Invocation ID: ${res[index].invocationId}`)
							messages.push(`Log Contents: `)
							let contents = res[index].content
							for(let index in contents){
								messages.push(`  ${contents[index].log}`)
							}
							messages.push("\n")
						}
					}
					this.serverless.cli.consoleLog(messages.join("\n"))
				});
			}else{
				this.serverless.cli.consoleLog(`    Function Not Found`)
			}
		});
	}

	// Creating the function parameters that are passed onto the SDK to get the logs
	buildFunctionParams(name, config, localFuncs){
		let params = {
			name: name,
			functionId: localFuncs[name].id
		};
		if(config.id){
			params.id = config.id;
		}
		if(this.options.startTime){
			params.startTime = this.getStartTime(this.options.startTime.toString())
		}
		return utils.extend({}, this.provider.defaultParams, params);
	}

	// Checks the user input for the time enterend and creates a new Data object based on their input
	getStartTime(userInput){
		let startTime
		let timeBase = 0
		if(userInput.charAt(userInput.length-1)=='m' || userInput.charAt(userInput.length-1)=='M'){
			timeBase = 60000
		}else if(userInput.charAt(userInput.length-1)=='h' || userInput.charAt(userInput.length-1)=='H'){
			timeBase = 3600000
		}else if(userInput.charAt(userInput.length-1)=='d' || userInput.charAt(userInput.length-1)=='D'){
			timeBase = 86400000
		}

		if(isNaN(parseInt(userInput.substring(0, userInput.length-1))) || timeBase==0){
			throw new this.serverless.classes.Error(`Incorrect Time Syntax`);
		}else{
			userInput = parseInt(userInput.substring(0, userInput.length-1))
			startTime = new Date(Date.now() - userInput*timeBase)
		}

		return startTime
	}
}

module.exports = SpotinstLogs;