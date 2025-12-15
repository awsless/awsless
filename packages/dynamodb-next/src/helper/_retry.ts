// import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'

type RetryProps<T> = {
	fn: () => Promise<T>
	when?: (error: unknown) => boolean
	maxAttempts?: number
	delay?: number | ((attempt: number) => number)
}

export const retry = async <T>({ fn, when, delay = 1000, maxAttempts = 3 }: RetryProps<T>): Promise<T> => {
	let attempt = 0

	while (true) {
		try {
			return await fn()
		} catch (error) {
			if (!when || when(error)) {
				if (++attempt >= maxAttempts) {
					throw error
				}

				const time = typeof delay === 'function' ? delay(attempt) : delay

				await new Promise(resolve => setTimeout(resolve, time))
			} else {
				throw error
			}
		}
	}
}

// await retry({
// 	when: error => error instanceof TransactionCanceledException,
// 	delay: attempt => attempt * 100 + Math.random() * 100,
// 	maxAttempts: 3,
// 	fn: async () => {
// 		// return updateItem()
// 	},
// })
