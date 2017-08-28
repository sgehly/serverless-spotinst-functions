"use strict";

const config = require("../config");
const utils = require("lodash");
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class SpotinstDeploy extends LocalFunctionsMapper {
	constructor(serverless, options){
		super();

		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);

		this.setHooks();
	}

	setHooks(){
		this.hooks = {
			'before:deploy:deploy': _ => this.init(),
			'deploy:deploy': _ => this.deploy()
		}
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client;

		return Promise.resolve();
	}

	deploy(funcs){
		let calls = [],
			localFuncs = this.getLocalFunctions(),
			serviceFuncs = funcs || utils.cloneDeep(this.serverless.service.functions);

		this.serverless.cli.consoleLog(chalk.yellow.underline('Deploy functions:'));

		utils.forEach(serviceFuncs, (config, name) => {
			if(localFuncs[name]){
				calls.push(this.update(name, config, localFuncs[name]));

			} else {
				calls.push(this.create(name, config));
			}
		});

		return Promise.all(calls)
			.then( functions => {
				if(this.options.function){
					this.saveInLocal(functions);
				} else {
					this.saveInLocal(functions, localFuncs);
				}
			});
	}

	create(name, config){
		let params = this.buildFunctionParams(name, config);

		return this._client.create({function: params})
			.then(res => this.success(res, params))
			.catch(err => this.error(err, params));
	}

	update(name, config, localFunc){
		config.id = localFunc.id;
		let params = this.buildFunctionParams(name, config);

		return this._client.update({function: params})
			.then(res => this.success(res, params, true))
			// The update call does not return the edited func. so we will get it
			.then( _ => this.getEditedFunc(config.id))
			.catch(err => this.error(err, params));
	}


	getEditedFunc(id){
		let params = utils.extend({id}, this.provider.defaultParams);
		return this._client.read(params)
			.then( items => items[0]);
	}

	buildFunctionParams(name, config){
		let [file, handler] = config.handler.split(".");
		let runtime = this.getRuntime(config.runtime);

		let params = {
			name: name,
			runtime: runtime,
			limits: {
				timeout: config.timeout,
				memory: config.memory,
			},
			code : {
				handler: handler,
				source: this.prepareCode(file, config.runtime)
			}
		};

		if(config.id){
			params.id = config.id;
		}

		return utils.extend({}, this.provider.defaultParams, params);
	}

	getRuntime(runtime){
		if(!config.runtimes[runtime]){
			throw new this.serverless.classes.Error(
				`${runtime} is invalid runtime. The available runtime are ${Object.keys(config.runtimes).join(", ")}`
			);
		}

		return runtime.replace(/\./g, "");
	}

	prepareCode(file, runtimeName) {
		let result = "";
		let runtime = config.runtimes[runtimeName];

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

	saveInLocal(funcs, localFuncs){
		let jsonToSave = localFuncs || {};
		funcs.filter(func => func).forEach(func => jsonToSave[func.name] = func);

		this.updateLocalFunctions(jsonToSave);
	}

	success(res, params, updated){
		this.serverless.cli.consoleLog(`${params.name}: ${updated ? 'updated' : 'created'}`);
		return res;
	}

	error(err, params){
		this.serverless.cli.consoleLog(`${params.name}: failed with error: ${err}`);
		return null;
	}
}

module.exports = SpotinstDeploy;