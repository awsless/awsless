import { BigFloat, ZERO, gt } from '@awsless/big-float'
import { ErrorMessage, PipeResult, getOutput, getPipeIssues } from 'valibot'

export function positive<T extends BigFloat | number>(error?: ErrorMessage) {
	return (input: T): PipeResult<T> => {
		return gt(input, ZERO)
			? getOutput(input)
			: getPipeIssues('positive', error ?? 'Invalid positive number', input)
	}
}
