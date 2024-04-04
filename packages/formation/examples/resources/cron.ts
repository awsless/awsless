import { fromIni } from '@aws-sdk/credential-providers'
import { aws, WorkSpace, App, Stack, local, Asset } from '../../src'
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
		dir: './state',
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

const app = new App('test-formation-cron')
const stack = new Stack('cron')
app.add(stack)

const role = new aws.iam.Role('cron-test', {
	assumedBy: 'lambda.amazonaws.com',
})

const lambda = new aws.lambda.Function('cron-lambda', {
	name: 'awsless-formation-cron',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

stack.add(lambda, role)

const rule = new aws.events.Rule('cron-test-2', {
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

const permission = new aws.lambda.Permission('cron-test-2', {
	action: 'lambda:InvokeFunction',
	principal: 'events.amazonaws.com',
	functionArn: lambda.arn,
	sourceArn: rule.arn,
})

stack.add(rule, permission)

const main = async () => {
	await workspace.deployStack(stack)
}

main()
