"use strict";

const chalk = require('chalk');
const Invoke = require("../invoke/invoke");
const request = require('request');

class SpotinstInvoke extends Invoke {
	constructor(serverless, options){
		super(serverless, options);
	}

	setHooks(){
		this.hooks = {
			'before:invoke:invoke': _ => this.init(),
			'invoke:invoke': _ => this.invoke()
		}
	}

	invokeNode(name, localFunc){
		return this.invokeFunction(name, localFunc);
	}

	invokePython(name, localFunc){
		return this.invokeFunction(name, localFunc);
	}

	invokeFunction(name, localFunc){
		return this.getSingleFunction(name)
			.then(func => {
				let params = this.params;

				if(typeof this.params == "object"){
					params = JSON.stringify(this.params);
				}

				const options = {
					url: func[0].url,
					headers: {
						'Authorization': `Bearer ${this.provider.envVars.TOKEN}`
					},
					body: params,
					method: "POST"
				};

				return new Promise((resolve, reject) => {
					request(options, (error, response, body) => {
						if(error || !response || response.statusCode != 200){
							reject(error || body);

						} else {
							this.serverless.cli.consoleLog(`Response:\n ${JSON.stringify(body, null, 4)}`);
							resolve(body);
						}
					});
				});
			});
	}

	getSingleFunction(funcName){
		const funcs = this.getLocalFunctions();

		if(!funcs[funcName]){
			throw new this.serverless.classes.Error(`Function '${this.options.f}' doesn't exist in this service.`);
		}

		let params = Object.assign({id: funcs[funcName].id}, this.provider.defaultParams);

		return this._client.read(params);
	}
}

module.exports = SpotinstInvoke;