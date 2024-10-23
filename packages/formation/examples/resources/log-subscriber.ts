import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('log-subscriber')
const stack = new Stack(app, 'log-subscriber')

const logGroup = new aws.cloudWatch.LogGroup(stack, 'log-group', {
	name: '/aws/lambda/log-subscriber',
})

export const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'log-subscriber',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

new aws.lambda.Permission(stack, 'permission', {
	action: 'lambda:InvokeFunction',
	principal: 'logs.amazonaws.com',
	functionArn: lambda.arn,
	sourceArn: logGroup.arn,
})

new aws.cloudWatch.SubscriptionFilter(stack, 'log-subscriber', {
	logGroupName: logGroup.name,
	destinationArn: lambda.arn,
	filterPattern: '{$.level = ERROR}',
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
