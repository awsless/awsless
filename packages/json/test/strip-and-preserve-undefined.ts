import { stringify } from '../src'

describe('strip & preserve undefined', () => {
	it('strip undefined values inside an object', () => {
		const input = { key: undefined }
		const result = stringify(input)
		expect(result).toBe('{}')
	})

	it(`preserve undefined values inside an object`, () => {
		const input = { key: undefined }
		const result = stringify(input, { preserveUndefinedValues: true })
		expect(result).toBe('{"key":{"$undefined":0}}')
	})

	it(`preserve undefined values inside an array`, () => {
		const input = [undefined]
		const result = stringify(input)

		expect(result).toBe('[{"$undefined":0}]')
	})

	it(`preserve undefined values inside a set`, () => {
		const input = new Set([undefined])
		const result = stringify(input)

		expect(result).toBe('{"$set":[{"$undefined":0}]}')
	})

	it(`preserve undefined values inside a map`, () => {
		const input = new Map([[undefined, undefined]])
		const result = stringify(input)

		expect(result).toBe('{"$map":[[{"$undefined":0},{"$undefined":0}]]}')
	})
})
