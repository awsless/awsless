
import { TransactionCanceledException as Exception } from '@aws-sdk/client-dynamodb'

declare module '@aws-sdk/client-dynamodb' {
	export interface TransactionCanceledException {
		conditionFailedAt: (index:number) => boolean
	}
}

Exception.prototype.conditionFailedAt = (index:number): boolean => {
	return (this as unknown as Exception).CancellationReasons?.[index]?.Code === 'ConditionalCheckFailed'
}
