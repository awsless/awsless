import { aws, App, Stack } from '../../src'
import { createWorkspace } from './_util'

const app = new App('cognito')
const stack = new Stack('cognito')
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

const userPool = new aws.cognito.UserPool('user-pool', {
	name: 'cognito-test',
	deletionProtection: true,
	allowUserRegistration: true,
	username: { emailAlias: true, caseSensitive: false },
	password: { minLength: 12 },
})

stack.add(userPool)

const client = new aws.cognito.UserPoolClient('client', {
	userPoolId: userPool.id,
	name: 'cognito-test-client',
	supportedIdentityProviders: ['cognito'],
	authFlows: {
		userSrp: true,
	},
})

stack.add(client)

const triggers = new aws.cognito.LambdaTriggers('trigger', {
	userPoolId: userPool.id,
	triggers: {
		beforeLogin: lambda.arn,
		beforeToken: lambda.arn,
		afterLogin: lambda.arn,
		beforeRegister: lambda.arn,
		// afterRegister: lambda.arn,
		// userMigration: lambda.arn,
		// customMessage: lambda.arn,
		// defineChallange: lambda.arn,
		// createChallange: lambda.arn,
		verifyChallange: lambda.arn,
	},
})

stack.add(triggers)

const main = async () => {
	const workspace = createWorkspace('jacksclub')
	await workspace.deployStack(stack)
}

main()
