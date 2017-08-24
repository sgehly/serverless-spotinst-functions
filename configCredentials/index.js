'use strict';

const config = require("../config");
const path = require('path');

class SpotinstConfigCredentials {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		this.setCommands();
		this.setHooks();
	}

	setCommands(){
		// this will be merged with the core config commands
		this.commands = {
			config: {
				commands: {
					credentials: {
						lifecycleEvents: [
							'config',
						],
						options: {
							token: {
								usage: 'Spotinst Token.',
								shortcut: 't',
								required: true
							},
							account: {
								usage: 'Spotinst Account ID.',
								shortcut: 'a',
								required: true
							},
							key: {
								required: false
							},
							secret: {
								required: false
							}
						}
					},
				},
			},
		};
	}

	setHooks(){
		this.hooks = {
			'config:credentials:config': _ => this.configureCredentials()
		};
	}

	configureCredentials() {
		// sanitize
		this.options.provider = this.options.provider.toLowerCase();

		// resolve if provider option is not 'spotinst'
		if (this.options.provider !== 'spotinst') {
			this.serverless.cli.consoleLog(
				`Provider should be 'spotinst'. Aborting...`
			);
			return Promise.resolve();
		}

		// validate
		if (!this.options.token) {
			throw new this.serverless.classes.Error('Please include --token option for Spotinst.');
		}

		this.serverless.cli.log('Setting up Spotinst Functions...');
		this.serverless.cli.log(`Saving your credentials in "~/${config.homeProviderFile}"...`);

		// locate home directory on user's machine
		const env = process.env;
		const home = env.HOME ||
			env.USERPROFILE ||
			(env.HOMEPATH ? ((env.HOMEDRIVE || 'C:/') + env.HOMEPATH) : null);

		if (!home) {
			throw new this.serverless.classes
				.Error('Can\'t find home directory on your local file system.');
		}

		// check if ~/.spotinstprops exists
		const credsPath = path.join(home, config.homeProviderFile);

		if (this.serverless.utils.fileExistsSync(credsPath)) {
			// check if credentials files contains anything
			const credsFile = this.serverless.utils.readFileSync(credsPath);

			// if credentials file exists w/ token, exit
			if (credsFile.length && credsFile.indexOf(`token`) > -1) {
				this.serverless.cli.consoleLog(
					`Failed! ~/${config.homeProviderFile} exists and already has credentials.`
				);

				return Promise.resolve();
			}
		}

		// write credentials file
		this.serverless.utils.writeFileSync(
			credsPath,
			`default:
  token: ${this.options.token}
  account: ${this.options.account}
`);

		this.serverless.cli.consoleLog(
			`Success! Your Spotinst credentials were stored in the configuration file (~/${config.homeProviderFile}).`
		);

		return Promise.resolve();
	}
}

module.exports = SpotinstConfigCredentials ;
