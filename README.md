# Serverless - Spotinst Functions
Spotinst Functions is a Multi-Cloud Functions-as-a-Service (FaaS) platform that utilizes affordable compute and network infrastructure. Spotinst will take care of everything required to run and scale your code with high availabilty across all cloud providers (AWS, Azure, Google Cloud, IBM Cloud, Oracle, and Equinix.)

Functions are independent units of deployment, like microservices. They are code deployed and the cloud written to perform a specific job. 

## Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system. For more information, please see the Serverless [provider documentation.](https://serverless.com/framework/docs/providers/spotinst/) for Spotinst.

### Prerequisites
You will need a Spotinst Account and Spotinst API token to complete setup. [Sign up for a Spotinst Account here.](https://console.spotinst.com/?utm_source=website&utm_medium=header#/auth/signUp "Spotinst Signup")
You can create your API token by navigating to My Account>API and selecting generate token.
*Note: You only need to set up your credentials once.*

![img](https://i.imgur.com/e8wz1uRm.png) 

![img](https://i.imgur.com/GYLkNvnl.png)


### Installing
First, install the serverless framework.
```
npm install -g serverless
```
Next, set up your credentials. You'll need to have the Spotinst Serverless plugin already installed inside a new Serverless project. Create a new template project and specify the directory with --path
```
serverless create --template spotinst-nodejs --path new-service
```
Install node modules from within the directory (in this example: /new-service)
```
npm install
```
If this is your first Functions project, you need to configure your credentials. Enter your Spotinst Account and API token:

```
serverless config credentials --provider spotinst --token {Your Spotinst API Token} --account {Your Spotinst Account ID}
```
Double-check that your credentials are properly set up:
```
cat ./spotinst/credentials
```
You should see the account ID and token.

## Deployment

Deploying a project places it into production and allows you to see and edit it in the Spotinst Console. In order to deploy, you will need to associate the function with an environment in the Spotinst Console. The environment ID can be found on the Spotinst Console under Functions. In this menu you will be able to add applications, environments, and functions. An application is a collection of one or more environments, and an environment is a collection of one or more functions. Use this structure to organize projects in a way that best suits your needs.

Select the application and environment to see the environment ID. Copy-paste this ID into your severless.yml file. Don't forget to change your function name before deploying!

![img](https://i.imgur.com/BrQrmFyl.png)
```
service: your-service

provider:
  name: spotinst
  spotinst:
    environment: {environment ID} # ex: env-123456

functions:
  hello:  # this defaults to hello, don't forget to change it!
    runtime: nodejs8.3
    handler: handler.main
    memory: 128
    timeout: 30
    access: private
```
With that set, you can deploy (and later, update) the service with the same command:
```
serverless deploy
```
To deploy/update a single function, use:
```
serverless deploy -f hello
```

## Invoking the function
You can invoke the function from the Spotinst Console and from the command line. To invoke from the command line, run: 
```
serverless invoke -f hello
```
To use the Spotinst Console, select the function from within the Application and Environment menu and click 'run test' from the 'Test' tab. 

Additionally, if you change the access parameter to 'public' in your function's serverless.yml file, you can invoke your function using the generated HTTP endpoint, found under the 'Triggers' tab in the Console. Also under 'Triggers' is the ability to add a CRON trigger for running the function at a regular interval.

![img](https://i.imgur.com/gq09YbGl.png)

## Logs
Logs are viewable in the 'Logs' section of each function on the Spotinst Console. There is a small time lag between function invokation and logs appearing in the list.

You can see the logs for a given function from the command line. Use the --startTime option to denote a unit of time.
```
serverless logs -f hello --StartTime 3h
```
This command will show you the past 3 hours worth of logs for the function *hello*.

## Cleanup
If you no longer need your service, run the remove command to ensure you don't incur any unexpected charges:
```
serverless remove
```
