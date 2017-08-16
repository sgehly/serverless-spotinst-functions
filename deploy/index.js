"use strict";

const config = require("../config");
const utils = require("lodash");
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

class SpotinstDeploy {
	constructor(serverless, options){
		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this._client = this.provider.client;

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'deploy:deploy': _ => this.deploy()
		}
	}

	deploy(){
		let calls = [];

		this.serverless.cli.consoleLog(`${chalk.yellow.underline('Creating functions:')}`);
		utils.forEach(this.serverless.service.functions,
			(config, name) => calls.push(this.create(name, config)));

		return Promise.all(calls);
	}

	create(name, config){
		let params = this.buildFunctionParams(name, config);

		return this._client.create({function: params})
			.then(res => this.success(res, params))
			.catch(err => this.error(err, params));
	}

	buildFunctionParams(name, config){
		let [file, handler] = config.handler.split(".");
		let runtime = this.getRuntime(this.serverless.service.provider.runtime);

		let params = {
			name: name,
			runtime: runtime,
			limits: {
				timeout: config.timeout,
				memory: config.memory,
			},
			code : {
				handler: handler,
				source: this.prepareCode(file)
			}
		};

		return utils.extend({}, this.provider.defaultParams, params);
	}

	getRuntime(runtime){
		if(utils.keys(config.runtimes).indexOf(runtime) == -1)
			throw new this.serverless.classes.Error(`${runtime} is invalid runtime. The available runtime are ${config.runtimes.join()}`);

		return runtime.replace(/\./g, "");
	}

	prepareCode(file) {
		let result = "";
		let runtime = config.runtimes[this.serverless.service.provider.runtime];

		if( file.slice(-4) == ".zip"){
			let filePath = `${path.join(this.serverless.config.servicePath, file)}`;
			let bitmap = fs.readFileSync(filePath);

			// convert binary data to base64 encoded string
			result = new Buffer(bitmap).toString('base64');

		} else {
			let zip = AdmZip();
			let rootFile = runtime.rootFile;
			let filePath = `${path.join(this.serverless.config.servicePath, file)}.${runtime.ext}`;

			zip.addLocalFile(filePath, null, rootFile);

			//For later use. zip the current folder and upload.
			// zip.addLocalFolder(this.serverless.config.servicePath, null, path => path != runtime.rootFile);

			// convert binary data to base64 encoded string
			result = new Buffer(zip.toBuffer()).toString('base64');
		}

		return result;
	}

	success(res, params){
		this.serverless.cli.consoleLog(`${params.name}: success`);

		return res;
	}

	error(err, params){
		this.serverless.cli.consoleLog(`${params.name}: failed with error: ${err}`);
		return null;
	}
}

module.exports = SpotinstDeploy;