import { aws, App, Stack } from '../../src'
import { createWorkspace } from './_util'

const app = new App('cron')
const stack = new Stack('cron')
app.add(stack)

const role = new aws.iam.Role('role', {
	assumedBy: 'lambda.amazonaws.com',
})

const lambda = new aws.lambda.Function('lambda', {
	name: 'awsless-formation-cron',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

stack.add(lambda, role)

const rule = new aws.events.Rule('rule', {
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

const permission = new aws.lambda.Permission('permission', {
	action: 'lambda:InvokeFunction',
	principal: 'events.amazonaws.com',
	functionArn: lambda.arn,
	sourceArn: rule.arn,
})

stack.add(rule, permission)

const main = async () => {
	const workspace = createWorkspace('jacksclub')
	await workspace.deployStack(stack)
}

main()
