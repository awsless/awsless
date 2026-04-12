export class DynamoDBError extends Error {
	readonly __type: string
	readonly statusCode: number

	constructor(type: string, message: string, statusCode: number = 400) {
		super(message)
		this.__type = `com.amazonaws.dynamodb.v20120810#${type}`
		this.statusCode = statusCode
	}

	toJSON() {
		return {
			__type: this.__type,
			message: this.message,
		}
	}
}

export class ValidationException extends DynamoDBError {
	constructor(message: string) {
		super('ValidationException', message, 400)
	}
}

export class ResourceNotFoundException extends DynamoDBError {
	constructor(message: string) {
		super('ResourceNotFoundException', message, 400)
	}
}

export class ResourceInUseException extends DynamoDBError {
	constructor(message: string) {
		super('ResourceInUseException', message, 400)
	}
}

export class ConditionalCheckFailedException extends DynamoDBError {
	readonly Item?: Record<string, unknown>

	constructor(message: string = 'The conditional request failed', item?: Record<string, unknown>) {
		super('ConditionalCheckFailedException', message, 400)
		this.Item = item
	}

	override toJSON() {
		return {
			__type: this.__type,
			message: this.message,
			...(this.Item && { Item: this.Item }),
		}
	}
}

export interface CancellationReason {
	Code: 'None' | 'ConditionalCheckFailed' | 'ItemCollectionSizeLimitExceeded' | 'TransactionConflict' | 'ProvisionedThroughputExceeded' | 'ThrottlingError' | 'ValidationError'
	Message?: string | null
	Item?: Record<string, unknown>
}

export class TransactionCanceledException extends DynamoDBError {
	readonly CancellationReasons: CancellationReason[]

	constructor(message: string, reasons: CancellationReason[]) {
		super('TransactionCanceledException', message, 400)
		this.CancellationReasons = reasons
	}

	override toJSON() {
		return {
			__type: this.__type,
			message: this.message,
			CancellationReasons: this.CancellationReasons,
		}
	}
}

export class TransactionConflictException extends DynamoDBError {
	constructor(message: string = 'Transaction is ongoing for the item') {
		super('TransactionConflictException', message, 400)
	}
}

export class ProvisionedThroughputExceededException extends DynamoDBError {
	constructor(message: string = 'The level of configured provisioned throughput for the table was exceeded') {
		super('ProvisionedThroughputExceededException', message, 400)
	}
}

export class ItemCollectionSizeLimitExceededException extends DynamoDBError {
	constructor(message: string = 'Collection size exceeded') {
		super('ItemCollectionSizeLimitExceededException', message, 400)
	}
}

export class InternalServerError extends DynamoDBError {
	constructor(message: string = 'Internal server error') {
		super('InternalServerError', message, 500)
	}
}

export class SerializationException extends DynamoDBError {
	constructor(message: string) {
		super('SerializationException', message, 400)
	}
}

export class IdempotentParameterMismatchException extends DynamoDBError {
	constructor(message: string = 'The request uses the same client token as a previous, but non-identical request') {
		super('IdempotentParameterMismatchException', message, 400)
	}
}
