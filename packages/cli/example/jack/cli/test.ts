// export const onFailureBucketArn = `arn:aws:s3:::${onFailureBucketName}`
// export const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueueName}`

import { onFailureBucketArn, onFailureQueueArn } from '../../../src/lib/server/on-failure'

export default () => {
	console.log(onFailureBucketArn)
	console.log(onFailureQueueArn)
}
