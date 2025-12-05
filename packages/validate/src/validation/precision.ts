import { BigFloat, parse } from '@awsless/big-float'
import { ErrorMessage, custom } from 'valibot'

// export function precision<T extends BigFloat | number>(decimals: number, error?: ErrorMessage) {
// 	return (input: T): PipeResult<T> => {
// 		const big = new BigFloat(input.toString())
// 		return -big.exponent <= decimals
// 			? getOutput(input)
// 			: getPipeIssues('precision', error ?? `Invalid ${decimals} precision number`, input)
// 	}
// }

export function precision<T extends BigFloat | number>(decimals: number, error?: ErrorMessage) {
	return custom<T>(
		input => {
			const big = parse(input.toString())
			return -big.exponent <= decimals
		},
		error ?? `Invalid ${decimals} precision number`
	)
}
