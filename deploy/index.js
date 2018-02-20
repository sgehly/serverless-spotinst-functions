"use strict";

const config = require("../config");
const utils = require("lodash");
const chalk = require('chalk');
const fs = require("fs");
const path = require("path");
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
  }
  
  deploy(funcs){
    let calls = [],
        environmentFunctions = {},
        localFuncs = this.getLocalFunctions(),
        serviceFuncs = funcs || utils.cloneDeep(this.serverless.service.functions);

    this.serverless.cli.consoleLog(chalk.yellow.underline('Deploy functions'));

    // this will get all the functions in the environment 
    return this.getRemoteFuncs().then((functionsRes)=>{
      // here we are createing a list of all the functions with their name as the key
      for(let i in functionsRes){ 
        environmentFunctions[functionsRes[i].name] = functionsRes[i]
      }
      // now we need to get the information about each functions endpoint
      return this.provider.client.EndpointService.Pattern.list(this.provider.defaultParams).then((endpointRes)=>{
        // here we find information on each funcitons cron expression
        return this.provider.client.SpectrumService.Events.list(this.provider.defaultParams).then((cronRes)=>{
          // now we link the cron expression to the appropriate function
          for(let i in cronRes)
            for(let j in environmentFunctions)
              if(cronRes[i].resourceId == environmentFunctions[j].id)
                environmentFunctions[j].cron = {isEnabled: cronRes[i].isEnabled, cronExpression: cronRes[i].cronExpression, id: cronRes[i].id}
                        
          //here we link the endpoint pattern to the funciton
          for(let i in endpointRes)
            for(let j in environmentFunctions)
              if(endpointRes[i].functionId == environmentFunctions[j].id)
                environmentFunctions[j].endpoint = {pattern:endpointRes[i].pattern, method:endpointRes[i].method, id: endpointRes[i].id}

          // now we will send the functions to either update or create depending on if they exsist in the environment
          utils.forEach(serviceFuncs, (config, name) => {
            const nameWithStage = `${name}-${this.options.stage}`;
            if (environmentFunctions[name]){
              calls.push(this.update(name, config, environmentFunctions[name]))
            }else {
              calls.push(this.create(name, config));
            }
          });
          return Promise.all(calls)
            .then( functions => this.saveInLocal(functions, localFuncs, serviceFuncs));
        }).catch((err)=>{
        throw new this.serverless.classes.Error(
          `Error Fetching Cron: ${err}`)
      })
      }).catch((err)=>{
        console.log(err)
        throw new this.serverless.classes.Error(
          `Error Fetching Endpoints: ${err}`)
      })
    }).catch((err)=>{
      console.log(err)
      throw new this.serverless.classes.Error(
        `Error Fetching Functions: ${err}`
      );
    })
  }
  
  create(name, config){
    let params = this.buildFunctionParams(name, config, null);
    
    return this._client.create({function: params})
      .then(res => this.createCron(res, config))
      .then(res => this.createPattern(res, config))
      .then(res => this.success(res, params))
      .catch(err => this.error(err, params));
  }
  
  update(name, config, localFunc){
    if(this.provider.defaultParams.environmentId !== localFunc.environmentId){
      throw new this.serverless.classes.Error(
        `'${name}' has already been deployed to environment '${localFunc.environmentId}'. This cannot be changed (sent: '${this.provider.defaultParams.environmentId}')`
      );
    }
    config.id = localFunc.id;
    let params = this.buildFunctionParams(name, config, localFunc);
    
    return this.getFunction(config.id)
      .then(func => {
        if(localFunc.latestVersion === func.latestVersion){
          return this._client.update({function: params})
            .then(_ => this.createCron({}, config, localFunc))
            .then(res=>this.createPattern({}, config, localFunc))
            .then(res => this.success(res, params, true))
            // The update call does not return the edited func. so we will get it
            .then(res => this.getFunction(config.id, res))
            .catch(err => this.error(err, params));
        } else{
          throw new this.serverless.classes.Error(
            `Version Error: '${name}' Function has a version '${localFunc.latestVersion}' which does not match the submitted version '${func.latestVersion}'. Please go to your Spotinst console for more information.`
          );
        }
      });
  }
  
  getFunction(id, extraParams){
    let params = utils.extend({id}, this.provider.defaultParams);
    return this._client.read(params)
      .then( items => utils.extend(items[0], extraParams || {}));
  }
  
  getRemoteFuncs(){
    let params = {
      environmentId:this.provider.defaultParams.environmentId,
      accountId:this.provider.defaultParams.accountId
    }

    return this._client.list(params)
  }

  buildFunctionParams(name, config, envFunction){
    let runtime = this.getRuntime(config.runtime);
    let totalPercent = 0
    let highVersionNumber, currentVersionNumber
    let negative = false
    
    if (config.id) {
      this.getFunction(config.id)
        .then(func => {
          currentVersionNumber = func.latestVersion
          for (let item in config.activeVersions) {
            totalPercent += config.activeVersions[item].percentage
            if (config.activeVersions[item].version < 0) {
              negative = true
            }
        
            if (config.activeVersions[item].version !== '$LATEST') {
              highVersionNumber = Math.max(parseInt(config.activeVersions[item].version), highVersionNumber)
            }
          }
          
          if (config.activeVersions) {
            if (totalPercent !== 100) {
              throw new this.serverless.classes.Error(
                `total percent of activeVersions must be exactly 100`
              )
            }
  
            if (negative) {
              throw new this.serverless.classes.Error(
                `version numbers must be positive`
              )
            }
        
            if (highVersionNumber > currentVersionNumber) {
              throw new this.serverless.classes.Error(
                `requested activeVersions number (${highVersionNumber}) exceeds highest published version`
              )
            }
          }
        })
    }
    
    if(config.timeout % 30 !== 0 || config.timeout > 300){
      throw new this.serverless.classes.Error(
        `timeout should be a multiple of 30 and maximum of 300. (${config.timeout} given)`
      );
    }
    
    if(config.memory%64 !== 0 || config.memory < 128 || config.memory > 2496){
      throw new this.serverless.classes.Error(
        `memory should be a multiple of 64 with minimum of 128 and maximum of 2496. (${config.memory} given)`
      );
    }
    
    let params = {
      name: name,
      runtime: runtime,
      access: config.access || "private",
      limits: {
        timeout: config.timeout,
        memory: config.memory,
      },
      code : {
        handler: config.handler,
        source: this.prepareCode(runtime)
      }
    };

    if(envFunction!=null && (config.environmentVariables || envFunction.environmentVariables)){
      let envVars = {}
      //setting variables from yml
      for(let i in config.environmentVariables){
        envVars[i] = config.environmentVariables[i]
      }
      //setting variables from console
      for(let i in envFunction.environmentVariables){
        envVars[i] = envFunction.environmentVariables[i]
      }
      params.environmentVariables = envVars
    }

    if(config.id){
      params.id = config.id;
    }
    
    if(config.activeVersions){
      params.activeVersions = config.activeVersions;
    }

    if(config.cors){
      params.cors = config.cors;
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
  
  prepareCode(runtime) {
    let filePath;
    if(runtime === "java8"){
      filePath = `${path.join(this.serverless.config.servicePath, config.localTargetFolder, this.serverless.service.service)}.jar`
    }else{
      filePath = `${path.join(this.serverless.config.servicePath, config.localPrivateFolder, this.serverless.service.service)}.zip`;
    }
    let bitmap = fs.readFileSync(filePath);
    
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
  }

  createPattern(res, config, localFunc){
    if(!config.endpoint && (!localFunc || !localFunc.endpoint))
      return res;

    let call = Promise.resolve();
    let endpointRequest = utils.extend({}, this.provider.defaultParams, {"functionId" :config.id});
    
    if(config.endpoint){
      if((!localFunc || !localFunc.endpoint)){
        //console.log("create endpoint")
        endpointRequest.functionId = res.id || localFunc.id;
        endpointRequest.pattern = config.endpoint.path;
        endpointRequest.method = config.endpoint.method.toUpperCase();

        call = this.provider.client.EndpointService.Pattern.create(endpointRequest);     
      } else {
        if(config.endpoint.path != localFunc.endpoint.pattern || config.endpoint.method.toUpperCase() != localFunc.endpoint.method) {
          //console.log("update endpoint")
          endpointRequest.pattern = config.endpoint.path;
          endpointRequest.method =  config.endpoint.method.toUpperCase();
          endpointRequest.id = localFunc.endpoint.id;
  
          call = this.provider.client.EndpointService.Pattern.update(endpointRequest)
        }         
      }
    } else {
        if(localFunc.endpoint){
          //console.log("delete endpoint")
          endpointRequest.id = localFunc.endpoint.id; 
          call = this.provider.client.EndpointService.Pattern.delete(endpointRequest)
        } 
    }
    
    return call
      .then(_ => res)
      .catch(err => {
        this.error(`function has been created but endpoint fail with error: ${err}`, config);
        return res;
      });
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
    
    if(config.cron){
      if((!localFunc || !localFunc.cron)){
        // console.log("create new cron")
        cronRequest.resourceId = res.id || localFunc.id
        cronRequest.isEnabled = config.cron.active;
        cronRequest.cronExpression = config.cron.value;
        
        call = this.provider.client.SpectrumService.Events.create(cronRequest) 
      } else {
        if(config.cron.active != localFunc.cron.isEnabled || config.cron.value != localFunc.cron.cronExpression) {
          // console.log("update cron")
          cronRequest.isEnabled = config.cron.active;
          cronRequest.cronExpression = config.cron.value;
          cronRequest.id = localFunc.cron.id;
          
          call = this.provider.client.SpectrumService.Events.update(cronRequest)
        }         
      }
    } else {
        if(localFunc.cron){
          // console.log("delete cron")
          cronRequest.id = localFunc.cron.id;
          call = this.provider.client.SpectrumService.Events.delete(cronRequest)
        } 
    }

    return call
      .then(_ => res)
      .catch(err => {
        this.error(`function has been created but scheduled trigger failed with error: ${err}`, config);
        return res;
      });
  }
  
  saveInLocal(funcs, localFuncs, serviceFuncs){
    let jsonToSave = localFuncs;
    
    funcs.filter(func => func).forEach(func => {
      func.stage = this.options.stage;
      jsonToSave[`${func.name}-${func.stage}`] = func;

      if(serviceFuncs[func.name].cron)
        jsonToSave[`${func.name}-${func.stage}`].cron = serviceFuncs[func.name].cron
      if(serviceFuncs[func.name].endpoint)
        jsonToSave[`${func.name}-${func.stage}`].endpoint = serviceFuncs[func.name].endpoint
    });

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