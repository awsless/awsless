<p align="center">Awsless - Infrastructure as a code</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@awsless/awsless.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/awsless)


[![npm downloads](https://img.shields.io/npm/dm/@awsless/awsless.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@awsless/awsless)


</div>

## Table of Contents

  - [Features](#features)
  - [Installing](#installing)
    - [Package manager](#package-manager)
  - [Getting Started](#getting-started)
    - [Base Configuration](#base-configuration)
    - [Modular stacks](#modular-stacks)
    - [Deployment](#deploying)
    - [Stack Updates](#stack-updates)
    - [Smart Helpers: Call Your Infra Like Functions](#smart-helpers-call-your-infra-like-functions)
  - [Testing Stacks](#testing-stacks)
  - [Resources](#resources)
    - [Function - AWS Lambda](#function---aws-lambda)
  - [License](#license)

## Features

🪶 AWS development using JSON config with best practices baked in

⚡ Deploy APIs, functions, databases, queues, and more — all in one place

🔒 Secure by default with IAM-based permissions and least privilege

🌍 First-class support for AWS Lambda, DynamoDB, SQS, EventBridge, and more

🧪 Built-in local development and testing utilities

🔄 Automatic function bundling with support for ES modules and TypeScript

🔄 Types generatation for all resources that can be acessed anywhere in the code


## Installing

### Package manager

Using npm:

```bash
$ npm i @awsless/awsless
```


Using pnpm:

```bash
$ pnpm i @awsless/awsless
```


## Getting Started
In an AWSless project, your infrastructure is organized into modular stack files, each with its own purpose, and a shared base configuration. Before you begin, make sure you have the AWS CLI installed.


### Base Configuration
This is your shared app configuration, which acts as the base stack for the entire project. This should exist in the root of your project.
`app.json`
```
{
  "name": "hello-world",
  "region": "eu-west-1",
  "profile": "test",
  "defaults": {
    "alerts": {
      "debug": "hello@gmail.com"
    }
  }
}
```
🔑 Key Fields
* name: Name of your application.

* region: AWS region where you want to deploy your infrastructure.

* profile: Your AWS CLI profile to use for deployment.



### Modular Stacks
Each feature/module of your application can be defined as a separate stack file. These live in their own folders and are completely independent.

Example - `auth/stack.json`
```
{
	"name": "auth",
	"functions": {
		"verify": "./src/lambda.ts" // AWS Lambda
	},

}
```

Example - `rate/stack.json`
```
{
	"name": "rate",
	"functions": {
		"limit": "./src/lambda.ts" // AWS Lambda
	},

}
```

You can create as many stack files as needed, each targeting different parts of your application.

### Deploying


Deploy all stacks
```bash
$ pnpm awsless deploy
```

Deploy individual stack
```bash
$ pnpm awsless deploy rate
```

Deploy multiple stacks
```bash
$ pnpm awsless deploy rate auth
```

Deploy base stack
```bash
$ pnpm awsless deploy base
```

### Stack Updates
AWSless makes it simple to remove infrastructure when it's no longer needed.

🧼 Delete a Specific Stack
```bash
$ pnpm awsless delete rate
```

💣 Delete All Stacks
```bash
pnpm awsless delete
```
⚠️ This will remove all deployed resources associated with your stacks. Use with caution!

♻️ Updating or Replacing Resources
When you modify a stack file and run a deployment again, AWSless will:

* Update existing resources if changes are detected.

* Delete resources that are removed from the stack file.

* Create new resources as needed.

* This ensures your infrastructure always reflects the current state of your stack configuration — no manual cleanup required.

### Smart Helpers: Call Your Infra Like Functions
Once your stacks are defined, AWSless provides built-in helpers like Fn, Queue, and Task to let you interact with your infrastructure directly from your application code — no wiring or manual setup needed.

To enable full type support for these resources, run:
```bash
$ pnpm run dev
```
This will watch your project and automatically generate type definitions for all the resources you've created.

You can then use them seamlessly inside your Lambda functions:

Now from one lambda function we can all any infra like
```typescript

import { Queue, Fn } from '@awsless/awsless'

// Call a Lambda function from another stack
await Fn.rate.limit()

// Push a message to a queue
await Queue.notifications.send({ userId: 123 })
```
💡 These helpers are fully typed and auto-wired, making your code clean, safe, and easy to maintain.



## Testing Stacks
AWSless supports built-in testing for your stacks to ensure everything works as expected before deployment.

You can define test folder in each stack
```json
{
    "name": "rate",
    "test": "./path/to/test/folder"
}
```

exmaple test case
`rate/test/utils.ts`
```typescript
describe('test', () => {
	it('hello world', async () => {
		expect(1 + 2).toStrictEqual(3)
	})
})
```

🔍 Run Tests Manually
```bash
$ pnpm awsless test rate
```

This will look for a defined test folder inside the rate stack directory and run any defined tests inside here.

🛡️ Tests Run Automatically Before Deploy
Whenever you run `pnpm awsless deploy`, AWSless will automatically:

* Check if a test/ folder exists for each stack

* Run the tests for that stack

* Block the deployment if any tests fail

## Resources

### Function - AWS Lambda
Basic usage
```json
{
  "functions": {
    "FUNCTION_NAME": "/path/to/function"
  }
}
```

Advanced usage

You can also customize your Lambda function with additional parameters like memory size, timeout, environment variables, and more:
```json
	"functions": {
		"test": {
			"code": "/path/to/function",
			"memorySize": 512
		}
	},
```

## License

[MIT](LICENSE)
