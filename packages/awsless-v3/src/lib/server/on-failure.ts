import { ACCOUNT_ID, bindGlobalResourceName, REGION } from './util'

export const onFailureQueue = bindGlobalResourceName('on-failure')('failure')
export const onFailureQueueArn = `arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${onFailureQueue}`

// export const onFailureQueueArn = process.env.ON_FAILURE_QUEUE_ARN
