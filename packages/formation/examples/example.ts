import { fromIni } from '@aws-sdk/credential-providers'
import { minutes } from '@awsless/duration'
import { App, AppError, aws, Stack, WorkSpace } from '../src'

const region = 'eu-west-1'
const credentials = fromIni({
	profile: 'jacksclub',
})

const workspace = new WorkSpace({
	cloudProviders: aws.createCloudProviders({
		region,
		credentials,
		accountId: '468004125411',
		timeout: minutes(15),
	}),
	lockProvider: new aws.dynamodb.LockProvider({
		region,
		credentials,
		tableName: 'awsless-locks',
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

const repo = new aws.ecr.Repository(stack, 'repo', {
	name: 'test',
})

const image = new aws.ecr.Image(stack, `image-1`, {
	repository: repo.name,
	name: 'test-2',
	tag: 'latest',
})

const image2 = new aws.ecr.Image(stack, `image-2`, {
	repository: repo.name,
	name: 'test-2',
	tag: 'latest',
})

// image.uri.apply(console.log)

// const repo = new aws.ecr.Image(stack, 'image', {
// 	image: Asset.fromFile('./docket.image'),
// })

const main = async () => {
	// const diff1 = await workspace.diffStack(stack)
	// console.log(diff1)

	console.log('START')

	try {
		await workspace.deployApp(app)
		// await workspace.deleteApp(app)
	} catch (error) {
		if (error instanceof AppError) {
			for (const issue of error.issues) {
				console.error(issue)
			}
		}

		throw error
	}

	console.log('END')

	// await workspace.deleteStack(stack)
	// await workspace.deployStack(stack)

	// const diff2 = await workspace.diffStack(stack)
	// console.log(diff2)
}

main()
