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

// export function unique<TInput extends any[]>(compare: (a: T[number], b:T[number]) => boolean = (a, b) => a === b) {
// 	return custom<any[]>((input) => {
// 		return input.length
// 	})
// }

// const schema = array(string(), [unique()])

// export function minLength<TInput extends string | any[]>(
// 	requirement: number,
// 	error?: ErrorMessage
//   ) {
// 	return (input: TInput): PipeResult<TInput> =>
// 	  input.length < requirement
// 		? getPipeIssues('min_length', error || 'Invalid length', input)
// 		: getOutput(input);
//   }

// export function unique<T extends any[], S extends any>(
// 	struct: Struct<T, S>,
// 	compare: (a: T[number], b:T[number]) => boolean = (a, b) => a === b
// ): Struct<T, S> {
// 	return refine(struct, 'unique', (value) => {
// 		for(const x in value) {
// 			for(const y in value) {
// 				if(x !== y && compare(value[x], value[y])) {
// 					return `Expected a ${struct.type} with unique values, but received "${value}"`
// 				}
// 			}
// 		}

// 		return true
// 	})
// }
