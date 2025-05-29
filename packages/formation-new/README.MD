
# Infrastructure as code made fast & easy

The `@awsless/formation` package is a TypeScript API that provides an infrastructure as code solution for AWS.

## The problem

The most used IaC solutions are slow & don't effectively leverage diffing to speed up their deployments.

## Todo's
- When a resource is being deleted inside a deployment we need to make sure that resources that depend on our deleted resource will be updated first.

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
import { App, FileStateBackend, FileLockBackend, $, Terraform, Stack, WorkSpace } from '@awsless/formation'

const terraform = new Terraform({
	providerLocation: './providers'
})

const aws = await terraform.install('hashicorp', 'aws', '5.93.0')

const workspace = new WorkSpace({
	providers: [
		aws({
			profile: "PROFILE",
			region: "REGION"
		})
	],
	backend: {
		state: new FileStateBackend({ dir: './states' }),
		lock: new FileLockBackend({ dir: './locks' }),
	}
})
```

With your workspace configuration ready we can now move on to defining your infrastructure.
This example illustrates how simple it is to define multi-stack resources without worrying about cross-stack references.

```ts
const app = new App('todo-app')
const storage = new Stack(app, 'storage')
const list = new $.aws.s3.Bucket(storage, 'list', {})

const items = new Stack(app, 'items')
const todo = new $.aws.s3.BucketObject(items, 'item', {
	bucket: list.bucket,
	key: 'item-1',
	content: JSON.stringify({
		title: 'Write docs...',
		done: true,
	}),
})
```

After defining your infrastructure, we can deploy our app.
```ts
await workspace.deploy(app)
```

Or destroy our app.
```ts
await workspace.delete(app)
```

Maybe you want to only deploy a subset of stacks.
```ts
await workspace.deploy(app, {
	filters: ["storage"]
})
```

## Production

For production, we recommend you use a state & lock backend that stores your data in the cloud.
An AWS DynamoDB table is perfect for storing locks.
While AWS S3 is perfect for storing your state files.

```ts
const workspace = new WorkSpace({
	providers: [...],
	backend: {
		lock: new DynamoLockBackend({
  			region,
  			credentials,
  			tableName: 'awsless-locks',
  		}),
		state: new S3StateBackend({
			region,
			credentials,
			bucket: 'awsless-state-UNIQUE_ID',
		}),
	}
})
```
