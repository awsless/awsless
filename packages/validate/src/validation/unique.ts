import { ErrorMessage, PipeResult, getOutput, getPipeIssues } from 'valibot'

export function unique<T extends any[]>(
	compare: (a: T[number], b: T[number]) => boolean = (a, b) => a === b,
	error?: ErrorMessage
) {
	return (input: T): PipeResult<T> => {
		for (const x in input) {
			for (const y in input) {
				if (x !== y && compare(input[x], input[y])) {
					return getPipeIssues('unique', error ?? 'None unique array', input)
				}
			}
		}

		return getOutput(input)
	}
}
