"use strict";

const config = require("../config");
const path = require("path");

class LocalFunctionsMapper {
	constructor(){}

	getLocalFunctions(){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		if (this.serverless.utils.fileExistsSync(localFilesPath)) {
			return this.serverless.utils.readFileSync(localFilesPath);

		} else {
			return {};
		}
	}

	updateLocalFunctions(funcs){
		const localFilesPath = path.join(this.serverless.config.servicePath,
			config.localPrivateFolder,
			config.functionPrivateFile);

		return this.serverless.utils.writeFileSync(localFilesPath, funcs);
	}
}

module.exports = LocalFunctionsMapper;