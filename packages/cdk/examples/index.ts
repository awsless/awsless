import { Stack, StackProps, App, Tags } from 'aws-cdk-lib'
import { SnsEventSource, SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import { LambdaFunction } from '../src/resources/lambda/function'

class UnlockBonusStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props)

		const table = new

		// Topic.fromTopicArn(scope, '', '')

		const topic = new Topic(this, 'Topic', {
			topicName: 'topic',
		})

		const queue = new Queue(this, 'Queue', {
			queueName: 'queue'
		})

		const fn = LambdaFunction(this, 'Function1', {
			name: 'test',
			file: 'file.js',
			// events: [
			// 	{ type: 'SNS', topic: topic },
			// 	{ type: 'SQS', queue: queue }
			// ]
		})

		fn.addEventSource(new SnsEventSource(topic))
		fn.addEventSource(new SqsEventSource(queue))

		// fn.configureAsyncInvoke({})

		// fn.grantInvoke()
		// fn.addToRolePolicy(new PolicyStatement({
		// 	actions: ['lambda:InvokeFunction']
		// }))

		// LambdaFunction(this, 'Function2', {
		// 	name: 'test',
		// 	file: 'file.js'
		// })

		Tags.of(this).add('Stack', id)
	}
}

new UnlockBonusStack(new App(), 'unlock-bonus')

// const app = new App()

// new UnlockBonusStack(app, 'unlock-bonus', {
// 	stackName: 'unlock-bonus',
// 	// env: {
// 	// 	account: process.env.CDK_DEFAULT_ACCOUNT,
// 	// 	region: process.env.CDK_DEFAULT_REGION,
// 	// },
// })

// new UnlockBonusStack(app, 'unlock-bonus', {
// 	stackName: 'unlock-bonus',
// 	env: {
// 		// account: process.env.CDK_DEFAULT_ACCOUNT,
// 		// region: process.env.CDK_DEFAULT_REGION,
// 	},
// })

// app.synth()

// await stack

// app.synth({

// })
