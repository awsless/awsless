// Resources with a lifecycle (like cache redis clients) normally clean
// up via the lambda context, which directly called handlers in tests
// don't have. They register here instead & the test environment flushes
// everything when the test file finishes.

// The vitest global, declared instead of imported so the runtime
// bundle never depends on vitest.
declare const afterAll: (typeof import('vitest'))['afterAll'] | undefined

const callbacks: (() => unknown)[] = []
let hooked = false

export const registerTestCleanup = (callback: () => unknown) => {
	callbacks.push(callback)
}

// Called from the test environment setup, so the hook registers during
// collection - vitest rejects hooks registered inside a running test.
export const hookTestCleanup = () => {
	if (hooked || typeof afterAll === 'undefined') {
		return
	}

	hooked = true

	afterAll(async () => {
		await Promise.all(callbacks.splice(0).map(callback => callback()))
	})
}
