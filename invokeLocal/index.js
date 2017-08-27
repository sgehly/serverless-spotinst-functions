"use strict";

const path = require("path");
const spawn = require('child_process').spawn;
const Invoke = require("../invoke/invoke");
const config = require("../config");

class SpotinstInvokeLocal extends Invoke {
	constructor(serverless, options){
		super(serverless, options);
	}

	setHooks(){
		this.hooks = {
			'before:invoke:local:invoke': _ => this.init(),
			'invoke:local:invoke': _ => this.invoke()
		}
	}

	invokeNode(name, func){
		const [file, handler] = func.handler.split(".");
		const modulePath = path.join(this.serverless.config.servicePath, file);

		//require the module
		const module = require(modulePath);

		let functionResponse = module[handler](this.params);

		return Promise.resolve(functionResponse)
			.then(result => {
				this.serverless.cli.consoleLog(`Response:\n ${JSON.stringify(result, null, 4)}`);
				return result;
			})
			.catch( err => {
				this.serverless.cli.consoleLog(`Error: ${err}`);
				return err;
			});
	}

	invokePython(name, func){
		if (process.env.VIRTUAL_ENV) {
			process.env.PATH = `${process.env.VIRTUAL_ENV}/bin:${process.env.PATH}`;
		}

		const [file, handler] = func.handler.split(".");

		return new Promise(resolve => {
			const python = spawn( path.join(__dirname, config.pythonInvoker), [file, handler], { env: process.env });
			python.stdout.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
			python.stderr.on('data', (buf) => this.serverless.cli.consoleLog(buf.toString()));
			python.stdin.write(JSON.stringify(this.params || {}));
			python.stdin.end();
			python.on('close', () => resolve());
		});
	}
}

module.exports = SpotinstInvokeLocal;