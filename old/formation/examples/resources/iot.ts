import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('iot')
const stack = new Stack(app, 'iot')

const role = new aws.iam.Role(stack, 'role', {
	assumedBy: 'lambda.amazonaws.com',
})

const policy = new aws.iam.RolePolicy(stack, 'policy', {
	role: role.name,
	name: 'lambda-policy',
	version: '2012-10-17',
})

const lambda = new aws.lambda.Function(stack, 'lambda', {
	name: 'iot-formation-lambda',
	code: {
		zipFile: `module.exports.default = async (event) => {
	console.log(event, "event");
	return {
		isAuthenticated: true,
		principalId: 'jack',
		disconnectAfterInSeconds: 86400,
		refreshAfterInSeconds: 86400,
		policyDocuments: [
			{
				Version: '2012-10-17',
				Statement: [
					{ Action: 'iot:Connect', Effect: 'Allow', Resource: '*' },
					{
						Action: 'iot:Publish',
						Effect: 'Allow',
						Resource: [
							'arn:aws:iot:eu-west-1:468004125411:topic/jacksclub/pubsub/test'
						]
					},
					{
						Action: 'iot:Subscribe',
						Effect: 'Allow',
						Resource: [
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
							'arn:aws:iot:eu-west-1:468004125411:topicfilter/jacksclub/pubsub/test',
						]
					},
					{
						Action: 'iot:Receive',
						Effect: 'Allow',
						Resource: [
							'arn:aws:iot:eu-west-1:468004125411:topic/jacksclub/pubsub/test'
						]
					}
				]
			}
		]
	}
}`,
	},
	role: role.arn,
})

const logGroup = new aws.cloudWatch.LogGroup(stack, 'iot-log', {
	name: lambda.name.apply(name => `/aws/lambda/${name}`),
})

policy.addStatement(
	{
		actions: ['logs:CreateLogStream'],
		resources: [logGroup.arn],
	},
	{
		actions: ['logs:PutLogEvents'],
		resources: [logGroup.arn.apply(arn => `${arn}:*` as `arn:${string}`)],
	}
)

const authorizer = new aws.iot.Authorizer(stack, 'authorizer', {
	name: 'iot-formation',
	functionArn: lambda.arn,
	// enableSigning: false,
})

new aws.lambda.Permission(stack, 'permission', {
	functionArn: lambda.arn,
	principal: 'iot.amazonaws.com',
	sourceArn: authorizer.arn,
	action: 'lambda:InvokeFunction',
})

const domain = new aws.iot.DomainConfiguration(stack, 'domain', {
	name: 'test-formation',
	authorizer: {
		name: 'iot-formation',
	},
})

domain.dependsOn(authorizer)

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
