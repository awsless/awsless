import { formatResourceName, getAccountId, getAppId, getRegion } from './util.js'

// Read at call time: the CLI sets the app env after importing this module.
export const getOnFailureBucketName = () => {
	return formatResourceName({
		resourceType: 'on-failure',
		resourceName: 'failure',
		postfix: getAppId(),
	})
}

export const getOnFailureQueueName = () => {
	return formatResourceName({
		resourceType: 'on-failure',
		resourceName: 'failure',
	})
}

export const getOnFailureBucketArn = () => `arn:aws:s3:::${getOnFailureBucketName()}`
export const getOnFailureQueueArn = () => `arn:aws:sqs:${getRegion()}:${getAccountId()}:${getOnFailureQueueName()}`
