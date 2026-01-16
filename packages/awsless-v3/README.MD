<p align="center">Awsless - Infrastructure as a code</p>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@awsless/awsless.svg?style=flat-square)](https://www.npmjs.org/package/@awsless/awsless)

[![npm downloads](https://img.shields.io/npm/dm/@awsless/awsless.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@awsless/awsless)

</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Features](#features)
- [Installing](#installing)
    - [Package manager](#package-manager)
- [Getting Started](#getting-started)
    - [Base Configuration](#base-configuration)
    - [Modular Stacks](#modular-stacks)
    - [Deploying](#deploying)
    - [Stack Updates](#stack-updates)
    - [Smart Helpers: Call Your Infra Like Functions](#smart-helpers-call-your-infra-like-functions)
- [Testing Stacks](#testing-stacks)
- [Core Resources](#core-resources)
    - [Function - AWS Lambda](#function---aws-lambda)
        - [Basic usage](#basic-usage)
        - [Advanced usage](#advanced-usage)
    - [Task](#task)
        - [Basic usage](#basic-usage-1)
        - [Advanced usage](#advanced-usage-1)
    - [Table](#table)
        - [Usage](#usage)
    - [Queue](#queue)
        - [Usage](#usage-1)
    - [Topics](#topics)
        - [Usage](#usage-2)
    - [Crons](#crons)
        - [Usage](#usage-3)
        - [RPC](#rpc)
- [Smart Functions - Call your infra from code](#smart-functions---call-your-infra-from-code)
    - [Examples](#examples)
        - [Lambda Function](#lambda-function)
        - [Task](#task-1)
        - [Queue](#queue-1)
        - [Topic](#topic)
        - [Config](#config)

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

In an Awsless project, your infrastructure is organized into modular stack files, each with its own purpose, and a shared base configuration. Before you begin, make sure you have the AWS CLI installed.

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

- name: Name of your application.

- region: AWS region where you want to deploy your infrastructure.

- profile: Your AWS CLI profile to use for deployment.

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

Awsless makes it simple to remove infrastructure when it's no longer needed.

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
When you modify a stack file and run a deployment again, Awsless will:

- Update existing resources if changes are detected.

- Delete resources that are removed from the stack file.

- Create new resources as needed.

- This ensures your infrastructure always reflects the current state of your stack configuration — no manual cleanup required.

### Smart Helpers: Call Your Infra Like Functions

Once your stacks are defined, Awsless provides built-in helpers like Fn, Queue, and Task to let you interact with your infrastructure directly from your application code — no wiring or manual setup needed.

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

Awsless supports built-in testing for your stacks to ensure everything works as expected before deployment.

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
Whenever you run `pnpm awsless deploy`, Awsless will automatically:

- Check if a test/ folder exists for each stack

- Run the tests for that stack

- Block the deployment if any tests fail

## Core Resources

### Function - AWS Lambda

#### Basic usage

```json
{
	"functions": {
		"FUNCTION_NAME": "/path/to/function"
	}
}
```

#### Advanced usage

You can also customize your Lambda function with additional parameters like memory size, timeout, environment variables, and more:

```json
	"functions": {
		"test": {
			"code": "/path/to/function",
			"memorySize": 512
		}
	},
```

### Task

A Task in Awsless is an asynchronous Lambda function designed for background processing. You can trigger a task and immediately move on — Awsless handles the execution in the background, including retries and logging on failure.

#### Basic usage

```json
{
	"tasks": {
		"FUNCTION_NAME": "/path/to/function"
	}
}
```

#### Advanced usage

You can also customize your Lambda function with additional parameters like memory size, timeout, environment variables, and more:

```json
	"tasks": {
		"test": {
			"code": "/path/to/function",
			"memorySize": 512
		}
	},
```

### Table

The tables feature in Awsless allows you to define fully managed, serverless DynamoDB tables directly in your stack configuration.

#### Usage

```json
{
	"tables": {
		"TABLE_NAME": {
			"hash": "id",
			"sort": "user",
			"indexes": {
				"list": {
					"hash": "createdAt",
					"sort": "id"
				}
			}
		}
	}
}
```

🔑 Key Fields:

- `hash` - Primary key
- `sort` - Sort key
- `indexes` - Define secondary index here

### Queue

This allows you to define a queue along with the consumer lambda.

#### Usage

```json
{
	"queues": {
		"sendMail": {
			"consumer": "/path/to/lambda/file",
			"maxConcurrency": 2,
			"batchSize": 5
		}
	}
}
```

### Topics

This allows you to define a topic along with the subscriber lambda.

#### Usage

```json
{
	{
  "topics": [ "TOPIC_NAME" ],
  "subscribers": {
    "TOPIC_NAME": "topic-consumer.ts",
  }
}
}
```

### Crons

Awsless uses AWS EventBridge to provide fully managed, serverless cron jobs — perfect for running scheduled tasks like cleanups, reports, or recurring syncs.

#### Usage

```json
{
	"crons": {
		"CRON_NAME": {
			"schedule": "1 day",
			"consumer": "cron-consumer.ts"
		}
	}
}
```

🔑 Key Options:

- `schedule`: The interval or cron expression to define when the job should run (e.g., "1 day" or "cron(0 12 \* _ ? _)").

- `consumer`: Path to the Lambda function that should be triggered on schedule.

#### RPC

Awsless allows you to easily expose any Lambda function as a type-safe RPC (Remote Procedure Call) endpoint for your frontend.

The request and response types are automatically inferred from your Lambda function's payload and return value, giving you end-to-end type safety.

```json
{
	"rpc": {
		"base": {
			// base resource defined in app.json
			"SendFriendRequest": "/path/to/lambda"
		}
	}
}
```

## Smart Functions - Call your infra from code

With awsless, you can interact with your infrastructure directly from your code. awsless generates all necessary types for you, allowing seamless access to your resources.

To set up, define your stacks and run:

```bash
$ pnpm awsless dev
```

This command will generate the required types and mappings, enabling you to access infrastructure components in your code effortlessly.

Resources are accessible via their stack name and resource name.
For instance, if a Lambda function exists within a stack named player, you can access its resources using:

`player.{resourceName}`

### Examples

#### Lambda Function

Calling a function named `limit` inside the `rate` stack:

```typescript
import { Fn } from '@awsless/awsless'

await Fn.rate.limit({ userId: 'test' })
```

#### Task

```typescript
import { Task } from '@awsless/awsless'

await Task.mail.send({ msg: 'hi', userId: 'test' })
```

#### Queue

Sending a message to a queue

```typescript
import { Queue } from '@awsless/awsless'

await Queue.mail.send({ msg: 'hi', userId: 'test' })
```

#### Topic

Publish a message to SNS topic

```typescript
import { Topic } from '@awsless/awsless'

await Topic.transaction.credit({ amount: 10, userId: 'test' })
```

#### Config

Reading a secret configuration value:

```typescript
import { Config } from '@awsless/awsless'

const key = await Config.API_KEY
```
