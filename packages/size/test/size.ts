import {
	Size,
	bytes,
	gibibytes,
	kibibytes,
	mebibytes,
	pebibytes,
	tebibytes,
	toBytes,
	toGibibytes,
	toKibibytes,
	toMebibytes,
	toPebibytes,
	toTebibytes,
} from '../src'

describe('Size', () => {
	describe('factory', () => {
		it('bytes', () => {
			const result = bytes(1)
			expect(result.value).toBe(1n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})

		it('kibibytes', () => {
			const result = kibibytes(1)
			expect(result.value).toBe(1024n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})

		it('mebibytes', () => {
			const result = mebibytes(1)
			expect(result.value).toBe(1024n * 1024n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})

		it('gibibytes', () => {
			const result = gibibytes(1)
			expect(result.value).toBe(1024n * 1024n * 1024n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})

		it('tebibytes', () => {
			const result = tebibytes(1)
			expect(result.value).toBe(1024n * 1024n * 1024n * 1024n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})

		it('pebibytes', () => {
			const result = pebibytes(1)
			expect(result.value).toBe(1024n * 1024n * 1024n * 1024n * 1024n)
			expectTypeOf(result).toEqualTypeOf<Size>()
		})
	})

	describe('transform', () => {
		const value = pebibytes(1)

		it('bytes', () => {
			const result = toBytes(value)
			expect(result).toBe(1024n * 1024n * 1024n * 1024n * 1024n)
		})

		it('kibibytes', () => {
			const result = toKibibytes(value)
			expect(result).toBe(1024n * 1024n * 1024n * 1024n)
		})

		it('mebibytes', () => {
			const result = toMebibytes(value)
			expect(result).toBe(1024n * 1024n * 1024n)
		})

		it('gibibytes', () => {
			const result = toGibibytes(value)
			expect(result).toBe(1024n * 1024n)
		})

		it('tebibytes', () => {
			const result = toTebibytes(value)
			expect(result).toBe(1024n)
		})

		it('pebibytes', () => {
			const result = toPebibytes(value)
			expect(result).toBe(1n)
		})
	})
})
