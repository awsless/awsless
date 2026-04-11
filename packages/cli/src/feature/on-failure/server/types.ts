export type FailureEvent = QueueFailureEvent | FunctionFailureEvent

export type QueueFailureEvent = {
	type: 'queue'
	id: string
	date: Date
	payload: unknown
	queue: {
		url?: string
		name?: string
	}
}

export type FunctionFailureEvent = {
	type: 'async-lambda' | 'dynamodb-stream'
	date: Date
	id: string
	payload: unknown
	function: {
		name: string
	}
	error?: {
		type: string
		message: string
		stackTrace?: string[]
	}
}

export type UnknownFailureEvent = AsyncLambdaFailureEvent | DynamoDBStreamFailureEvent

export type AsyncLambdaFailureEvent = {
	version: string
	timestamp: string
	requestContext: {
		requestId: string
		functionArn: string
		condition: 'OnFailure'
		approximateInvokeCount: number
	}
	requestPayload: unknown // Your original Lambda input
	responseContext: {
		statusCode: number
		executedVersion: string
		functionError: string
	}
	responsePayload: {
		// The error returned by the failed function
		errorMessage: string
		errorType: string
		stackTrace?: string[]
	}
}

export type DynamoDBStreamFailureEvent = {
	version: string
	timestamp: string
	requestContext: {
		requestId: string
		functionArn: string
		condition: 'RetriesExhausted' | 'MaximumRecordAgeExhausted'
		approximateInvokeCount: number
	}
	responseContext: {
		statusCode: number
		executedVersion: string
		functionError?: string // e.g., "Unhandled"
	}
	/**
	 * Metadata about the specific DynamoDB shard/batch.
	 */
	DDBStreamBatchInfo?: {
		shardId: string
		startSequenceNumber: string
		endSequenceNumber: string
		approximateArrivalTimestamp: number
		batchSize: number
		streamArn: string
	}
	/**
	 * The FULL stringified DynamoDBStreamEvent (Records[]).
	 */
	payload: string
}
