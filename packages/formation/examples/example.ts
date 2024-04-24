import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, local, Asset, AppError } from '../src'
import { minutes } from '@awsless/duration'

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region: 'eu-west-1',
		timeout: minutes(15),
		credentials: fromIni({
			profile: 'jacksclub',
		}),
	}),
	stateProvider: new local.FileProvider({
		dir: './examples/state',
	}),
})

// ------------------------------------------

const app = new App('test')
const stack = new Stack(app, 'test')

// ------------------------------------------

const table = new aws.dynamodb.Table(stack, 'test', {
	name: 'TEST',
	hash: 'key',
	stream: 'keys-only',
})

table.addItem(
	'test',
	Asset.fromJSON({
		key: '1',
	})
)

const stack2 = new Stack(app, 'test-2')

new aws.dynamodb.TableItem(stack2, 'test-2', {
	table,
	item: Asset.fromJSON({
		key: '2',
	}),
})

new aws.dynamodb.TableItem(stack2, 'test-3', {
	table,
	item: Asset.fromJSON({
		key: '3',
	}),
})

// ------------------------------------------

const main = async () => {
	// const diff1 = await workspace.diffStack(stack)
	// console.log(diff1)

	try {
		// await workspace.deployApp(app)
		await workspace.deleteApp(app)
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
