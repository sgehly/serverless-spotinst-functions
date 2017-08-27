"use strict";

const config = require("../config");
const path = require("path");

class LocalFunctionsMapper {
	constructor(){}

	getLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		return this.serverless.utils.readFileSync(localFilesPath);
	}

	updateLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		return this.serverless.utils.writeFileSync(localFilesPath, this._localFuncs);
	}
}

module.exports = LocalFunctionsMapper;