'use strict';

const Spotinst = require('spotinst-sdk-nodejs');
const config = require('../config');

class SpotinstProvider {
	constructor (serverless) {
		this._envVars = {};
		this._defaultParams = {};
		this._serverless = serverless;
		this._client = null;

		this._serverless.setProvider(config.providerName, this);
	}

	static getProviderName() {
		return config.providerName;
	}

	getProps(){
		config.envParams.forEach((envName) => {
			if (process.env[envName])
				this._envVars[envName] = process.env[envName];
		});
	}

	validateParams(){
		if (!this._envVars.ACCESS_TOKEN) {
			throw new this._serverless.classes.Error(`Missing 'ACCESS_TOKEN' environment variable`);
		}

		if(!this._serverless.service.provider.environment){
			throw new this._serverless.classes.Error(`Please insert environment ID in your serverless.yml`);
		}

		if(!this._serverless.service.provider.account){
			throw new this._serverless.classes.Error(`Please insert account ID in your serverless.yml`);
		}

		if(!this._serverless.service.provider.runtime){
			throw new this._serverless.classes.Error(`Please insert runtime type in your serverless.yml`);
		}

		this._defaultParams.environmentId = this._serverless.service.provider.environment;
		this._defaultParams.accountId = this._serverless.service.provider.account;
	}

	get envVars() {
		return this._envVars;
	}

	get defaultParams() {
		return this._defaultParams;
	}

	get client() {
		if(!this._client){
			this.getProps();
			this.validateParams();

			const authFunc = Spotinst.config.setToken(this._envVars.ACCESS_TOKEN);

			this._client = new Spotinst.Client(authFunc).functionsService;
		}

		return this._client;
	}
}

module.exports = SpotinstProvider;