"use strict";

const config = require("../config");
const utils = require('lodash');
const Deploy = require("../deploy/index");
const Info = require("../info/index")

class SpotinstDeployFunction extends Deploy {
	constructor(serverless, options){
		super(serverless, options);

	    const is_package_plugin = plugin => plugin.hasOwnProperty('packageFunction');
	    this.pkg = serverless.pluginManager.getPlugins().find(is_package_plugin);

	    this.infoObject = new Info(serverless, options)
	}

	setHooks(){
		this.hooks = {
			'before:deploy:function:deploy': _ => this.init(),
			'deploy:function:deploy': _ => this.pkg.packageService().then(()=>{this.deployFunction()})
		}
	}

	init(){
		this.provider.loadLocalParamsFile();
		this._client = this.provider.client.FunctionsService;
		this.infoObject.init()

		return Promise.resolve();
	}

	deployFunction(){
			let serviceFuncs = utils.cloneDeep(this.serverless.service.functions);

			if(!serviceFuncs[this.options.function]){
				throw new this.serverless.classes.Error(`Function ${this.options.function} does not exist in your serverless.yml`);
			}

			this.deploy({ [this.options.function] : serviceFuncs[this.options.function]}).then(()=>{
				this.infoObject.info()
			})	
	}
}

module.exports = SpotinstDeployFunction;