import { BigFloat } from '@awsless/big-float'
import { ErrorMessage, PipeResult, getOutput, getPipeIssues } from 'valibot'

export function precision<T extends BigFloat | number>(decimals: number, error?: ErrorMessage) {
	return (input: T): PipeResult<T> => {
		const big = new BigFloat(input.toString())
		return -big.exponent <= decimals
			? getOutput(input)
			: getPipeIssues('precision', error ?? `Invalid ${decimals} precision number`, input)
	}
}
