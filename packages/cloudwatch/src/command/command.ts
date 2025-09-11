export type Thenable<T> = {
	then<Result1 = T, Result2 = never>(
		onfulfilled: (value: T) => Result1,
		onrejected?: (reason: any) => Result2
	): Promise<Result1 | Result2>
}

export const thenable = <T>(callback: () => Promise<T>): Thenable<T> => {
	let promise: Promise<T> | undefined

	return {
		then(onfulfilled, onrejected) {
			return (promise ?? (promise = callback())).then(onfulfilled, onrejected)
		},
	}
}
