import { ACCOUNT_ID, APP_ID, formatResourceName, REGION } from './util'

export const onFailureBucketName = formatResourceName({
	resourceType: 'on-failure',
	resourceName: 'failure',
	postfix: APP_ID,
})

export const onFailureQueueName = formatResourceName({
	resourceType: 'on-failure',
	resourceName: 'failure',
})

export const onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`
export const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`
