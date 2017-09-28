module.exports = {
	providerName: 'spotinst',
	envParams : ['SPOTINST_TOKEN'],
	runtimes: {
		"java8" : "",
		"nodejs4.8": { rootFile : "index.js", ext: "js" },
		"nodejs8.3": { rootFile : "index.js", ext: "js" },
		"python2.7": { rootFile : "__main__.py", ext: "py" },
		"ruby2.4.1": { rootFile : "index.rb", ext: "rb" }
	},
	serverlessConfigFile: 'serverless.yml',
	localPrivateFolder: '.serverless',
	functionPrivateFile: 'serverless-functions-map.json',
	homeProviderFile: '.spotinst/credentials',
	pythonInvoker: "invoker.py"
};
