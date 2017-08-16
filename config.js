module.exports = {
	providerName: 'spotinst',
	envParams : ['ACCESS_TOKEN'],
	runtimes: {
		"java8" : "",
		"nodejs4.8": { rootFile : "index.js", ext: "js" },
		"python2.7": { rootFile : "__main__.py", ext: "py" }
	}
};
