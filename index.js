'use strict';

/*
 NOTE: this plugin is used to add all the different provider related plugins at once.
 This way only one plugin needs to be added to the service in order to get access to the
 whole provider implementation.
 */

const config = require("./config");
const SpotinstProvider = require('./provider/spotinstProvider');
const SpotinstInfo = require('./info');
const SpotinstLogs = require('./logs');
const SpotinstDeploy = require('./deploy');


class SpotinstFunctions {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.serverless.pluginManager.addPlugin(SpotinstProvider);
		this.serverless.pluginManager.addPlugin(SpotinstInfo);
		this.serverless.pluginManager.addPlugin(SpotinstLogs);
		this.serverless.pluginManager.addPlugin(SpotinstDeploy);
	}
}

module.exports = SpotinstFunctions;