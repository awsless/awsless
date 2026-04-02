import { APP_ID, build } from './util'

// export const onFailureQueue = bindGlobalResourceName('on-failure')('failure')
// export const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueue}`

// export const onFailureQueueArn = process.env.ON_FAILURE_QUEUE_ARN

export const onFailureName = build({
	resourceType: 'on-failure',
	resourceName: 'failure',
	postfix: APP_ID,
})

export const onFailureArn = `arn:aws:s3:::${onFailureName}`
