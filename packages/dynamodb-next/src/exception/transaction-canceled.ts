import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'

type Code = 'ConditionalCheckFailed' | 'TransactionConflict'

declare module '@aws-sdk/client-dynamodb' {
	export interface TransactionCanceledException {
		cancellationReasonAt: (index: number) => Code | undefined
		conditionFailedAt: (index: number) => boolean
		conflictAt: (index: number) => boolean
	}
}

TransactionCanceledException.prototype.cancellationReasonAt = function (index: number): Code | undefined {
	const reasons = this.CancellationReasons ?? []
	return reasons[index]?.Code as Code | undefined
}

/** Will return true if index has a conditional failure. */
TransactionCanceledException.prototype.conditionFailedAt = function (index: number): boolean {
	return this.cancellationReasonAt(index) === 'ConditionalCheckFailed'
}

/** Will return true if index has a transaction conflict. */
TransactionCanceledException.prototype.conflictAt = function (index: number): boolean {
	return this.cancellationReasonAt(index) === 'TransactionConflict'
}
