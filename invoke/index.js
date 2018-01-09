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

	invokeRuby(name, localFunc){
		return this.invokeFunction(name, localFunc);
	}

	invokeJava(name, localFunc){
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
						'Authorization': `Bearer ${this.provider.envVars.SPOTINST_TOKEN}`
					},
					body: params,
					method: "POST"
				};

				return new Promise((resolve, reject) => {
					request(options, (error, response, body) => {
						this.serverless.cli.consoleLog(`Response: (Status Code is ${response.statusCode})\n ${JSON.stringify(body, null, 4)}`);

						if(error || !response || response.statusCode != 200){
							resolve(error || body);

						} else {
							resolve(body);
						}
					});
				});
			});
	}

	getSingleFunction(funcName){
		const funcs = this.getLocalFunctions();
		const func = funcs[funcName] || funcs[`${funcName}-${this.options.stage}`];

		if(!func){
			throw new this.serverless.classes.Error(`Function '${this.options.f}' doesn't exist in this service.`);
		}

		let params = Object.assign({id: func.id}, this.provider.defaultParams);

		return this._client.read(params);
	}
}

module.exports = SpotinstInvoke;