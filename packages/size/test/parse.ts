import {
	Size,
	SizeFormat,
	parse,
	toBytes,
	toGibibytes,
	toKibibytes,
	toMebibytes,
	toPebibytes,
	toTebibytes,
} from '../src'

describe('Size Parser', () => {
	it('parse', () => {
		const result = parse('1 B')
		expect(toBytes(result)).toBe(1n)
		expectTypeOf(result).toEqualTypeOf<Size>()
	})

	it('invalid unit', () => {
		expect(() => {
			// @ts-ignore
			parse('1 UNK')
		}).toThrow(SyntaxError)
	})

	it('invalid number', () => {
		expect(() => {
			// @ts-ignore
			parse('a B')
		}).toThrow(SyntaxError)
	})

	it('invalid precision', () => {
		expect(() => {
			parse('1.1 B')
		}).toThrow(SyntaxError)
	})

	describe('types', () => {
		const list: [SizeFormat, (value: Size) => bigint, bigint][] = [
			['1 B', toBytes, 1n],
			['1 KB', toKibibytes, 1n],
			['1 MB', toMebibytes, 1n],
			['1 GB', toGibibytes, 1n],
			['1 TB', toTebibytes, 1n],
			['1 PB', toPebibytes, 1n],
			['999 PB', toPebibytes, 999n],
		]

		for (const [string, transform, expectation] of list) {
			it(string, () => {
				const result = parse(string)
				expect(transform(result)).toBe(expectation)
			})
		}
	})
})
