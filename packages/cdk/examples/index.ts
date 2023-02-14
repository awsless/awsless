import { Stack, StackProps, App, Tags } from 'aws-cdk-lib'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import { LambdaFunction } from '../src/resources/lambda/function'

class UnlockBonusStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const queue = new Queue(this, 'Queue', {
			queueName: 'queue',
		})

		LambdaFunction(this, 'Function', {
			name: 'test',
			file: 'file.js',
			events: [{ type: 'SQS', queue: queue.queueArn }],
		})

		LambdaFunction(this, 'Function2', {
			name: 'test',
			file: 'file.js',
		})

		Tags.of(this).add('Stack', id)
	}
}

const app = new App()

new UnlockBonusStack(app, 'unlock-bonus', {
	stackName: 'unlock-bonus',
	// env: {
	// 	account: process.env.CDK_DEFAULT_ACCOUNT,
	// 	region: process.env.CDK_DEFAULT_REGION,
	// },
})
