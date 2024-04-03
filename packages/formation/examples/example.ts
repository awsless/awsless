import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, local, Asset } from '../src'
import { minutes } from '@awsless/duration'
// import { SharedData } from '../src/core/__shared'

const region = 'eu-west-1'
const credentials = fromIni({
	profile: 'jacksclub',
})

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region,
		credentials,
		timeout: minutes(15),
	}),
	stateProvider: new local.StateProvider({
		dir: './examples/state',
	}),
	// stateProvider: new aws.dynamodb.DynamoDBStateProvider({
	// 	region,
	// 	credentials,
	// 	tableName: 'awsless-state',
	// }),
})

workspace.on('stack', e =>
	console.log(
		//
		new Date(),
		'[Stack]'.padEnd(30),
		// e.stack.name,
		e.operation.toUpperCase(),
		e.status.toUpperCase()
	)
)

workspace.on('resource', e =>
	console.log(
		//
		new Date(),
		`[${e.type}]`.padEnd(30),
		e.operation.toUpperCase(),
		e.status.toUpperCase(),
		e.reason?.message ?? ''
	)
)

const app = new App('test')

// ------------------------------------------

const stack = new Stack('test')

app.add(stack)

// ------------------------------------------

const table = new aws.dynamodb.Table('test', {
	name: 'TEST',
	hash: 'key',
	stream: 'keys-only',
})

table.addItem(
	'test',
	Asset.fromJSON({
		key: '2',
	})
)

stack.add(table)
stack.export('table-arn', table.arn)

app.import('test', 'table-arn').apply(v => {
	console.log(v)
})

// const bucket = new aws.s3.Bucket('test', {
// 	name: 'awsless-bucket-123',
// })

// stack.add(bucket)
// stack.export('asset-bucket-name', bucket.name)

// app.import('test', 'asset-bucket-name').apply(console.log)

// sharedData.set('asset-bucket-name', bucket.arn)

// ------------------------------------------

const main = async () => {
	const diff1 = await workspace.diffStack(stack)
	console.log(diff1)

	// await workspace.deleteStack(stack)
	await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
