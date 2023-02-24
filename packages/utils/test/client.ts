
import { globalClient } from "../src"

describe('client', () => {

	class Client {}
	const getter = globalClient(() => new Client)

	it('getter', async () => {
		const result = getter()

		expect(result).toBe(getter())
		expect(result instanceof Client).toBe(true)
	})

	it('setter', async () => {
		const older = getter()
		const newer = new Client()

		getter.set(newer)

		expect(older).not.toBe(newer)
		expect(newer).toBe(getter())
	})
})
