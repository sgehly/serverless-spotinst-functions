"use strict";

const chalk = require('chalk');
const path = require("path");
const config = require("../config");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class Invoke extends LocalFunctionsMapper {
	constructor(serverless, options){
		super();

		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);

		this.setHooks();
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client.FunctionsService;

		return Promise.resolve();
	}

	invoke(){
		let func = this.serverless.service.getFunction(this.options.function);
		let res;

		this.serverless.cli.consoleLog(chalk.yellow.underline(`Invoking function '${this.options.function}':`));

		this.getParams();
		switch(config.runtimes[func.runtime].ext){
			case "js":
				res = this.invokeNode(this.options.function, func);
				break;

			case "py":
				res = this.invokePython(this.options.function, func);
				break;

			case "rb":
				res = this.invokeRuby(this.options.function, func);
				break;

			default:
				throw new this.serverless.classes.Error(
					`${func.runtime} is invalid runtime. The available runtimes are ${Object.keys(config.runtimes).join(", ")}`
				);
				break;
		}

		return Promise.resolve(res);
	}

	getParams(){
		let functionObj = this.serverless.service.getFunction(this.options.function);

		this.params = functionObj.parameters || {};

		if (!this.options.data && this.options.path) {
			const absolutePath = path.isAbsolute(this.options.path) ?
				this.options.path :
				path.join(this.serverless.config.servicePath, this.options.path);

			if (!this.serverless.utils.fileExistsSync(absolutePath)) {
				throw new this.serverless.classes.Error('The file you provided does not exist.');
			}
			this.options.data = this.serverless.utils.readFileSync(absolutePath);
		}

		if(typeof this.options.data === "string"){
			try {
				this.options.data = JSON.parse(this.options.data);
			} catch(e){
				// do nothing if it's a simple string or object already
			}
		}

		Object.assign(this.params, this.options.data || {});
	}

	setHooks() {console.error("Implement 'setHooks' method")}
	invokeNode() {console.error("Implement 'invokeNode' method")}
	invokePython() {console.error("Implement 'invokePython' method")}
	invokeRuby() {console.error("Implement 'invokeRuby' method")}
}

module.exports = Invoke;