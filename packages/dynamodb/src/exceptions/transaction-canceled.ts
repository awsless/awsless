
import { TransactionCanceledException as Exception } from '@aws-sdk/client-dynamodb'

declare module '@aws-sdk/client-dynamodb' {
	export interface TransactionCanceledException {
		conditionFailedAt: (...indexes:number[]) => boolean
	}
}

/* Will return true if atleast one of the provided indexes has a conditional failure. */
Exception.prototype.conditionFailedAt = function(...indexes:number[]): boolean {
	const reasons = (this as unknown as Exception).CancellationReasons || []

	for(const index of indexes) {
		if(reasons[ index ]?.Code === 'ConditionalCheckFailed') {
			return true
		}
	}

	return false
}
