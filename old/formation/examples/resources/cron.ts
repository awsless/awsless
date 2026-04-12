import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('cron')
export const stack = new Stack(app, 'cron')

const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

export const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'awsless-formation-cron',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

export const rule = new aws.events.Rule(stack, 'rule', {
	name: 'app--stack--cron--test',
	schedule: 'rate(60 minutes)',
	enabled: true,
	targets: [
		{
			id: 'cron-test',
			arn: lambda.arn,
		},
	],
})

new aws.lambda.Permission(stack, 'permission', {
	action: 'lambda:InvokeFunction',
	principal: 'events.amazonaws.com',
	functionArn: lambda.arn,
	sourceArn: rule.arn,
})

console.log('START')

try {
	// await workspace.deployApp(app)
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
