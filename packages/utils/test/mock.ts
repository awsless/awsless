
import { mockFn, mockObjectValues, nextTick } from "../src"

describe('Mock', () => {

	const echo = (a:string) => a

	it('mockObjectValues', () => {
		const result = mockObjectValues({ echo })

		expect(result.echo('hi')).toBe('hi')
		expect(result.echo).toBeCalledTimes(1)
	})

	it('mockFn', () => {
		const result = mockFn(echo)

		expect(result('hi')).toBe('hi')
		expect(result).toBeCalledTimes(1)
	})

	it('nextTick', async () => {
		const result = await nextTick(echo, 'hi')
		expect(result).toBe('hi')
	})

	it('should work with complex functions', async () => {
		const complex = (a:object, b:object[]) => [ a, ...b ]

		mockObjectValues({ complex })
		mockFn(complex)

		await nextTick(complex, 'hi', ['world'])
	})
})
