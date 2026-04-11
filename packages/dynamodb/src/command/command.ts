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

export const transactable = <T>(transact: () => T) => ({
	transact,
})

export const iterable = <T>(
	cursor: string | undefined,
	callback: (cursor?: string) => Promise<{ cursor?: string; items: T[] }>
) => ({
	[Symbol.asyncIterator]() {
		let done = false

		return {
			async next(): Promise<{ done: true } | { done: false; value: T[] }> {
				if (done) {
					return { done: true }
				}

				const result = await callback(cursor)

				cursor = result.cursor

				if (!result.cursor) {
					done = true
				}

				if (result.items.length === 0) {
					return { done: true }
				}

				return {
					value: result.items,
					done: false,
				}
			},
		}
	},
})
