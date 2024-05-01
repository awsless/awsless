import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, Asset, AppError } from '../src'
import { minutes } from '@awsless/duration'
import { Bucket } from '../src/provider/aws/s3'

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
	lockProvider: new aws.dynamodb.LockProvider({
		region,
		credentials,
		tableName: 'awsless-state',
	}),
	stateProvider: new aws.s3.StateProvider({
		region,
		credentials,
		bucket: 'awsless-state',
	}),
	// stateProvider: new local.file.StateProvider({
	// 	dir: './examples/state',
	// }),
})

// ------------------------------------------

const app = new App('test')
const stack = new Stack(app, 'test')

// ------------------------------------------

const bucket = new Bucket(stack, 'bucket', {
	name: 'test-bucket-awsless',
})

bucket.addObject('id', {
	key: 'id',
	body: Asset.fromJSON({
		key: '1',
	}),
})

// const table = new aws.dynamodb.Table(stack, 'test', {
// 	name: 'TEST',
// 	hash: 'key',
// 	stream: 'keys-only',
// })

// table.addItem(
// 	'test',
// 	Asset.fromJSON({
// 		key: '1',
// 	})
// )

// const stack2 = new Stack(app, 'test-2')

// new aws.dynamodb.TableItem(stack2, 'test-2', {
// 	table,
// 	item: Asset.fromJSON({
// 		key: '2',
// 	}),
// })

// new aws.dynamodb.TableItem(stack2, 'test-3', {
// 	table,
// 	item: Asset.fromJSON({
// 		key: '3',
// 	}),
// })

// ------------------------------------------

const main = async () => {
	// const diff1 = await workspace.diffStack(stack)
	// console.log(diff1)

	try {
		await workspace.deleteApp(app)
		// await workspace.deleteApp(app)
	} catch (error) {
		if (error instanceof AppError) {
			for (const issue of error.issues) {
				console.error(issue)
			}
		}

		throw error
	}

	// await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
