import { requestPort } from '../src'

describe('Port Finder', () => {
	it('request open port', async () => {
		const min = 10000
		const max = 10002

		const [port1, unlock1] = await requestPort({ min, max })
		const [port2, unlock2] = await requestPort({ min, max })

		expect(port1).toBeGreaterThanOrEqual(min)
		expect(port1).toBeLessThanOrEqual(max)

		expect(port2).toBeGreaterThanOrEqual(min)
		expect(port2).toBeLessThanOrEqual(max)

		expect(port1).not.toBe(port2)

		await expect(requestPort({ min, max })).rejects.toThrow('No port found')

		await unlock1()
		await unlock2()
	})
})
