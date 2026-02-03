import { BigFloat, parse } from '@awsless/big-float'
import { CheckIssue, ErrorMessage, check } from 'valibot'

export function precision<T extends BigFloat | number>(
	decimals: number,
	message: ErrorMessage<CheckIssue<T>> = `Invalid ${decimals} precision number`
) {
	return check<T, ErrorMessage<CheckIssue<T>>>(input => {
		const big = parse(input.toString())
		return -big.exponent <= decimals
	}, message)
}
