'use strict';

const path = require('path');
const Spotinst = require('spotinst-sdk-nodejs');
const config = require('../config');
const YAML = require('js-yaml');

class SpotinstProvider {
	constructor (serverless, options) {
		this._envVars = {};
		this._defaultParams = {};
		this._serverless = serverless;
		this._options = options;
		this._client = null;

		this.getStage();

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

	loadLocalParamsFile(){
		// locate home directory on user's machine
		const env = process.env;
		const home = env.HOME ||
			env.USERPROFILE ||
			(env.HOMEPATH ? ((env.HOMEDRIVE || 'C:/') + env.HOMEPATH) : null);

		if (!home) {
			throw new this.serverless.classes
				.Error('Can\'t find home directory on your local file system.');
		}

		const credsPath = path.join(home, config.homeProviderFile);

		if(!this._serverless.utils.fileExistsSync(credsPath))
			throw new this._serverless.classes.Error(`Please run 'serverless config credentials' first`);

		const creds = this._serverless.utils.readFileSync(credsPath);
		const credsParsed = YAML.load(creds.toString(), { filename: credsPath });

		if(!credsParsed.default.account || !credsParsed.default.token){
			throw new this._serverless.classes.Error(`Please run 'serverless config credentials' first`);
		}

		this._defaultParams.accountId = credsParsed.default.account;
		this._envVars.SPOTINST_TOKEN = credsParsed.default.token;
	}

	validateParams(){
		if(!this._serverless.service.provider.spotinst || !this._serverless.service.provider.spotinst.environment){
			throw new this._serverless.classes.Error(`Please insert environment ID in your serverless.yml`);
		}

		this._defaultParams.environmentId = this._serverless.service.provider.spotinst.environment;
	}

	getStage(){
		this._options.stage =
			this._options.stage ||
			this._serverless.service.provider.stage ||
			"dev";
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

			const authFunc = Spotinst.config.setToken(this._envVars.SPOTINST_TOKEN);

			this._client = new Spotinst.Client(authFunc);
		}

		return this._client;
	}
}

module.exports = SpotinstProvider;