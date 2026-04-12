import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('cognito')
const stack = new Stack(app, 'cognito')

const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'awsless-formation-cron',
	code: {
		zipFile: 'module.exports.default = async () => ({ statusCode: 200, body: "Hello World" })',
	},
	role: role.arn,
})

const userPool = new aws.cognito.UserPool(stack, 'user-pool', {
	name: 'cognito-test',
	deletionProtection: true,
	allowUserRegistration: true,
	username: { emailAlias: true, caseSensitive: false },
	password: { minLength: 12 },
})

new aws.cognito.UserPoolClient(stack, 'client', {
	userPoolId: userPool.id,
	name: 'cognito-test-client',
	supportedIdentityProviders: ['cognito'],
	authFlows: {
		userSrp: true,
	},
})

new aws.cognito.LambdaTriggers(stack, 'trigger', {
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
