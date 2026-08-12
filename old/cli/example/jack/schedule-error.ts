// import { Task } from '@awsless/awsless'

import { seconds } from '@awsless/duration'
import { schedule } from '@awsless/scheduler'
import { bindGlobalResourceName } from '../../src/lib/server/util'
import { getTaskName, onFailureQueueArn } from '../../src/server'

export default async () => {
	const resourceTaskName = bindGlobalResourceName('task')

	await schedule({
		name: getTaskName('error', 'feature-2'),
		payload: { hello: 'world' },
		schedule: seconds(10),
		group: resourceTaskName('group'),
		roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName('schedule')}-other`,
		deadLetterArn: onFailureQueueArn,
	})
}
