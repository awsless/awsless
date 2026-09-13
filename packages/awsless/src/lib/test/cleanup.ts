// Directly called handlers in tests have no lambda context to clean up
// through, so resources register here & flush when the file finishes.

// Declared instead of imported, so the runtime never depends on vitest.
declare const afterAll: (typeof import('vitest'))['afterAll'] | undefined

const callbacks: (() => unknown)[] = []
let hooked = false

export const registerTestCleanup = (callback: () => unknown) => {
	callbacks.push(callback)
}

// Vitest rejects hooks registered inside a running test, so the test
// environment setup calls this during collection.
export const hookTestCleanup = () => {
	if (hooked || typeof afterAll === 'undefined') {
		return
	}

	hooked = true

	afterAll(async () => {
		await Promise.all(callbacks.splice(0).map(callback => callback()))
	})
}
