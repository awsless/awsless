import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'

type Code =
	| 'None'
	| 'ThrottlingError'
	| 'ValidationError'
	| 'TransactionConflict'
	| 'ConditionalCheckFailed'
	| 'ItemCollectionSizeLimitExceeded'
	| 'ProvisionedThroughputExceeded'

declare module '@aws-sdk/client-dynamodb' {
	export interface TransactionCanceledException {
		cancellationReasonAt: (index: number) => Code | undefined

		/** Will return true if index has a validation error. */
		validationErrorAt: (index: number) => boolean

		/** Will return true if index has a conditional check failure. */
		conditionFailedAt: (index: number) => boolean

		/** Will return true if index has a transaction conflict. */
		conflictAt: (index: number) => boolean

		// /** Will return true if index has a provisioned throughput exceeded error. */
		// throughputExceededAt: (index: number) => boolean

		// /** Will return true if index has a item-collection-size-limit-exceeded error. */
		// sizeLimitExceededAt: (index: number) => boolean

		// /** Will return true if index has a throttling error. */
		// throttledAt: (index: number) => boolean
	}
}

TransactionCanceledException.prototype.cancellationReasonAt = function (index: number): Code | undefined {
	const reasons = this.CancellationReasons ?? []
	const reason = reasons[index]

	if (!reason) {
		throw new Error(`Cancellation reason index is out of bounds: ${index}`)
	}

	return reason.Code as Code | undefined
}

TransactionCanceledException.prototype.conditionFailedAt = function (index: number): boolean {
	return this.cancellationReasonAt(index) === 'ConditionalCheckFailed'
}

TransactionCanceledException.prototype.conflictAt = function (index: number): boolean {
	return this.cancellationReasonAt(index) === 'TransactionConflict'
}

TransactionCanceledException.prototype.validationErrorAt = function (index: number): boolean {
	return this.cancellationReasonAt(index) === 'ValidationError'
}

// TransactionCanceledException.prototype.throttledAt = function (index: number): boolean {
// 	return this.cancellationReasonAt(index) === 'ThrottlingError'
// }

// TransactionCanceledException.prototype.sizeLimitExceededAt = function (index: number): boolean {
// 	return this.cancellationReasonAt(index) === 'ItemCollectionSizeLimitExceeded'
// }

// TransactionCanceledException.prototype.throughputExceededAt = function (index: number): boolean {
// 	return this.cancellationReasonAt(index) === 'ProvisionedThroughputExceeded'
// }
