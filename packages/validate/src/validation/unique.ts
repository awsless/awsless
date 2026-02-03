import { CheckIssue, ErrorMessage, check } from 'valibot'

export function unique<T extends any[]>(
	compare: (a: T[number], b: T[number]) => boolean = (a, b) => a === b,
	message: ErrorMessage<CheckIssue<T>> = 'None unique array'
) {
	return check<T, ErrorMessage<CheckIssue<T>>>(input => {
		for (const x in input) {
			for (const y in input) {
				if (x !== y && compare(input[x], input[y])) {
					return false
				}
			}
		}
		return true
	}, message)
}
