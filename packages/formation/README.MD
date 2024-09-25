
# Infrastructure as code made fast & easy

The `@awsless/formation` package is a TypeScript API that provides an infrastructure as code solution for AWS.

## The problem

The most used IaC solutions are slow & don't effectively leverage diffing to speed up their deployments.
<!-- In comparison, we are:

- __10x__ faster than AWS Cloud Formation.
- __5x__ faster than Terraform
- __4x__ faster than Pulumi -->

## Setup

Install with (NPM):

```
npm i @awsless/formation
```

## Example

First, you need to create a workspace instance and pass in the cloud providers that you will use.
We also need to give it a lock provider & state provider.

- A cloud provider is used to create resources on a specific cloud provider. We have built-in cloud providers for AWS resources, but you could simply add your own as well.

- The state provider is used for storing the latest deployment state.

- The lock provider is used for acquiring a lock when you deploy your app. This will guarantee that multiple people can never deploy the same application at the same time.

In this example, we will use a local file lock & state provider.

```ts
import { minutes } from '@awsless/duration'
import { fromIni } from '@aws-sdk/credential-providers'
import { App, Asset, local, aws, Stack, WorkSpace } from '../src'

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region: 'AWS_REGION',
		credentials: fromIni({ profile: 'AWS_PROFILE' }),
		accountId: 'AWS_ACCOUNT_ID',
		timeout: minutes(15),
	}),
	stateProvider: new local.file.StateProvider({
		dir: './state',
	}),
	lockProvider: new local.file.LockProvider({
		dir: './locks',
	}),
})
```

With your workspace configuration ready we can now move on to defining your infrastructure.
This example illustrates how simple it is to define multi-stack resources without worrying about cross-stack references.

```ts
const app = new App('shiny-new-app')
const stack = new Stack(app, 'storage')
const bucket = new aws.s3.Bucket(stack, 'files')

const stack2 = new Stack(app, 'todo')
const todoItem = new aws.s3.BucketObject(stack2, {
	bucket: bucket.name,
	key: 'item-1',
	body: Asset.fromString('Write documentation...'),
})
```

After defining your infrastructure, we can deploy our app.
```ts
await workspace.deployApp(app)
```

Or destroy our app.
```ts
await workspace.deleteApp(app)
```

Maybe you want to only deploy a subset of stacks
```ts
await workspace.deployApp(app, {
	filters: ["storage"]
})
```

## Production

For production, we recommend you use a state & lock provider that stores your data in the cloud.
An AWS DynamoDB table is perfect for storing locks.
While AWS S3 is perfect for storing your state files.

```ts
const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({ ... }),
	lockProvider: new aws.dynamodb.LockProvider({
		region,
		credentials,
		tableName: 'awsless-locks',
	}),
	stateProvider: new aws.s3.StateProvider({
		region,
		credentials,
		bucket: 'awsless-state-UNIQUE_ID',
	}),
})
```
