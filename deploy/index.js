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
        evironmentFunctions = {},
        localFuncs = this.getLocalFunctions(),
        serviceFuncs = funcs || utils.cloneDeep(this.serverless.service.functions);

    this.serverless.cli.consoleLog(chalk.yellow.underline('Deploy functions'));

    return this.getRemoteFuncs().then((res)=>{
      for(let i in res){ 
        evironmentFunctions[res[i].name] = res[i]
      }

      utils.forEach(serviceFuncs, (config, name) => {
        const nameWithStage = `${name}-${this.options.stage}`;
        if (evironmentFunctions[name]){
          calls.push(this.update(name, config, evironmentFunctions[name]))
        }else {
          calls.push(this.create(name, config));
        }
      });

      return Promise.all(calls)
        .then( functions => this.saveInLocal(functions, localFuncs));

    }).catch((err)=>{
      throw new this.serverless.classes.Error(
        `Error Getting Functions`
      );
    })
  }
  
  create(name, config){
    let params = this.buildFunctionParams(name, config);
    
    return this._client.create({function: params})
      .then(res => this.createCron(res, config))
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
    let params = this.buildFunctionParams(name, config);
    
    return this.getFunction(config.id)
      .then(func => {
        if(localFunc.latestVersion === func.latestVersion){
          return this._client.update({function: params})
            .then(_ => this.createCron({}, config, localFunc))
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

  buildFunctionParams(name, config){
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
      environmentVariables: config.environmentVariables,
      code : {
        handler: config.handler,
        source: this.prepareCode(runtime)
      }
    };

    if(config.id){
      params.id = config.id;
    }
    
    if(config.activeVersions){
      params.activeVersions = config.activeVersions;
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
    
    if(localFunc){
      //Update when cron exist
      if(localFunc.cron && localFunc.cron.id) {
        cronRequest.id = localFunc.cron.id;
        
        // Cron has been deleted from config
        if(!config.cron){
          call = this.provider.client.SpectrumService.Events.delete(cronRequest)
            .then(resCron => delete res.cron);
          
        } else {
          cronRequest.isEnabled = config.cron.active;
          cronRequest.cronExpression = config.cron.value;
          
          call = this.provider.client.SpectrumService.Events.update(cronRequest)
            .then(resCron => {
              res.cron = config.cron;
              res.cron.id = localFunc.cron.id;
            });
        }
        
        //Update with new cron
      } else if(config.cron){
        cronRequest.resourceId = localFunc.id;
        cronRequest.isEnabled = config.cron.active;
        cronRequest.cronExpression = config.cron.value;
        
        call = this.provider.client.SpectrumService.Events.create(cronRequest)
          .then(resCron => {
            res.cron = config.cron;
            res.cron.id = resCron.id;
          });
      }
      
    } else {
      //Create
      if(config.cron){
        cronRequest.resourceId = res.id;
        cronRequest.isEnabled = config.cron.active;
        cronRequest.cronExpression = config.cron.value;
        
        call = this.provider.client.SpectrumService.Events.create(cronRequest)
          .then(resCron => {
            res.cron = config.cron;
            res.cron.id = resCron.id;
          });
      }
    }
    
    return call
      .then(_ => res)
      .catch(err => {
        this.error(`function has been created but scheduled trigger failed with error: ${err}`, config);
        return res;
      });
  }
  
  saveInLocal(funcs, localFuncs){
    let jsonToSave = localFuncs;
    
    funcs.filter(func => func).forEach(func => {
      func.stage = this.options.stage;
      jsonToSave[`${func.name}-${func.stage}`] = func;
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