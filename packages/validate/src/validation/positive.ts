import { BigFloat, isPositive } from '@awsless/big-float'
import { CheckIssue, ErrorMessage, check } from 'valibot'

export function positive<T extends BigFloat | number>(
	message: ErrorMessage<CheckIssue<T>> = 'Invalid positive number'
) {
	return check<T, ErrorMessage<CheckIssue<T>>>(input => isPositive(input), message)
}
