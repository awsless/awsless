import { ACCOUNT_ID, APP_ID, build, REGION } from './util'

export const onFailureBucketName = build({
	resourceType: 'on-failure',
	resourceName: 'failure',
	postfix: APP_ID,
})

export const onFailureQueueName = build({
	resourceType: 'on-failure',
	resourceName: 'failure',
})

export const onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`
export const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`
