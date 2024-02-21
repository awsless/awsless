import { BigFloat, ZERO, gt } from '@awsless/big-float'
import { ErrorMessage, custom } from 'valibot'

// export function positive<T extends BigFloat | number>(error?: ErrorMessage) {
// 	return (input: T): PipeActionResult<T> => {
// 		return gt(input, ZERO)
// 			? actionOutput(input)
// 			: actionIssue({}, 'positive', error ?? 'Invalid positive number', input)
// 	}
// }

export function positive<T extends BigFloat | number>(error?: ErrorMessage) {
	return custom<T>(input => gt(input, ZERO), error ?? 'Invalid positive number')
}
