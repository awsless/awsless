import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('s3')
const stack = new Stack(app, 's3')

const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'awsless-formation-s3',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

new aws.lambda.Permission(stack, 'permission', {
	action: 'lambda:InvokeFunction',
	principal: 's3.amazonaws.com',
	functionArn: lambda.arn,
	sourceArn: 'arn:aws:s3:::awsless-formation-test-bucket',
})

new aws.s3.Bucket(stack, 'bucket', {
	name: 'awsless-formation-test-bucket',
	lambdaConfigs: [
		{
			event: 's3:ObjectCreated:*',
			function: lambda.arn,
		},
	],
	cors: [
		{
			origins: ['*'],
			methods: ['POST'],
		},
	],
})

console.log('START')

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

console.log('END')
