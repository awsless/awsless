import { SizeFormat, bytes, format, gibibytes, kibibytes, mebibytes } from '../src'

describe('Size Formatter', () => {
	const list: [Parameters<typeof bytes>[0], SizeFormat][] = [
		[0, '0 B'],
		[1, '1 B'],
		[1023, '1023 B'],
		[1024, '1 KB'],
		[1536, '1.5 KB'],
		[265318, '259.1 KB'],
		[1048576, '1 MB'],
		[1073741824, '1 GB'],
	]

	for (const [value, expectation] of list) {
		it(expectation, () => {
			expect(format(bytes(value))).toBe(expectation)
		})
	}

	it('round trips whole units', () => {
		expect(format(kibibytes(1))).toBe('1 KB')
		expect(format(mebibytes(512))).toBe('512 MB')
		expect(format(gibibytes(4))).toBe('4 GB')
	})
})
