"use strict";

const config = require("../config");
const utils = require("lodash");
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const Info = require("../info/index");
const LocalFunctionsMapper = require("../utils/localFunctionsMapper");

class SpotinstDeploy extends LocalFunctionsMapper {
	constructor(serverless, options){
		super();

		this.serverless = serverless;
		this.options = options || {};
		this.provider = this.serverless.getProvider(config.providerName);
		this.info = new Info(serverless, options);

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
		this._client = this.provider.client.FunctionsService;

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
					this.saveInLocal(functions, localFuncs);
				} else {
					this.saveInLocal(functions);
				}
			});
	}

	create(name, config){
		let params = this.buildFunctionParams(name, config);

		return this._client.create({function: params})
			.then(res => this.createCron(res, config))
			.then(res => this.success(res, params))
			.catch(err => this.error(err, params));
	}

	update(name, config, localFunc){
		if(this.provider.defaultParams.environmentId !== localFunc.environmentId)
			throw new this.serverless.classes.Error(
				`'${name}' has already been deployed to environment '${localFunc.environmentId}'. This cannot be changed (sent: '${this.provider.defaultParams.environmentId}')`
			);

		config.id = localFunc.id;
		let params = this.buildFunctionParams(name, config);

		return this._client.update({function: params})
			.then(_ => this.createCron({}, config, localFunc))
			.then(res => this.success(res, params, true))
			// The update call does not return the edited func. so we will get it
			.then(res => this.getEditedFunc(res, config.id))
			.catch(err => this.error(err, params));
	}


	getEditedFunc(extraParams, id){
		let params = utils.extend({id}, this.provider.defaultParams);
		return this._client.read(params)
			.then( items => utils.extend(items[0], extraParams));
	}

	buildFunctionParams(name, config){
		let [file, handler] = config.handler.split(".");
		let runtime = this.getRuntime(config.runtime);

		let params = {
			name: name,
			runtime: runtime,
			access: config.access || "private",
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
				`${runtime} is invalid runtime. The available runtimes are ${Object.keys(config.runtimes).join(", ")}`
			);
		}

		return runtime.replace(/\./g, "");
	}

	prepareCode(file, runtimeName) {
		let runtime = config.runtimes[runtimeName];

		let zip = AdmZip();
		let rootFile = runtime.rootFile;
		let filePath = `${path.join(this.serverless.config.servicePath, file)}.${runtime.ext}`;

		zip.addLocalFile(filePath, null, rootFile);

		zip.addLocalFolder(this.serverless.config.servicePath, null, p => this.isFileShouldBeInZip(p, file, runtime));

		// convert binary data to base64 encoded string
		return new Buffer(zip.toBuffer()).toString('base64');
	}

	isFileShouldBeInZip(path, file, runtime){
		let retVal = true;

		if(path === `${file}.${runtime.ext}`)
			retVal = false;

		if(path === config.serverlessConfigFile)
			retVal = false;

		if(path.indexOf(config.localPrivateFolder) > -1)
			retVal = false;

		if(path.indexOf("node_modules") > -1 && runtime.ext !== "js")
			retVal = false;

		return retVal;
	}

	createCron(res, config, localFunc){
		if(!config.cron && (!localFunc || !localFunc.cron))
			return res;

		let call = Promise.resolve();
		let cronRequest = utils.extend({}, this.provider.defaultParams, {
			action: "INVOKE_FUNCTION",
			config: {
				"body": "",
				"queryParams": []
			}
		});

		if(localFunc){
			//Update when cron exist
			if(localFunc.cron && localFunc.cron.id) {
				cronRequest.id = localFunc.cron.id;

				// Cron has been deleted from config
				if(!config.cron){
					call = this.provider.client.SpectrumService.Events.delete(cronRequest)
						.then(resCron => delete res.cron);

				} else {
					cronRequest.isEnabled = config.cron.active;
					cronRequest.cronExpression = config.cron.value;

					call = this.provider.client.SpectrumService.Events.update(cronRequest)
						.then(resCron => {
							res.cron = config.cron;
							res.cron.id = localFunc.cron.id;
						});
				}

			//Update with new cron
			} else if(config.cron){
				cronRequest.resourceId = localFunc.id;
				cronRequest.isEnabled = config.cron.active;
				cronRequest.cronExpression = config.cron.value;

				call = this.provider.client.SpectrumService.Events.create(cronRequest)
					.then(resCron => {
						res.cron = config.cron;
						res.cron.id = resCron.id;
					});
			}

		} else {
			//Create
			if(config.cron){
				cronRequest.resourceId = res.id;
				cronRequest.isEnabled = config.cron.active;
				cronRequest.cronExpression = config.cron.value;

				call = this.provider.client.SpectrumService.Events.create(cronRequest)
					.then(resCron => {
						res.cron = config.cron;
						res.cron.id = resCron.id;
					});
			}
		}

		return call
			.then(_ => res)
			.catch(err => {
				this.error(`function has been created but scheduled trigger failed with error: ${err}`, config);
				return res;
			});
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