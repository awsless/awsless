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
	toSafeBytes,
	toSafeGibibytes,
	toSafeKibibytes,
	toSafeMebibytes,
	toSafePebibytes,
	toSafeTebibytes,
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
			expect(result).toBe(1024 * 1024 * 1024 * 1024 * 1024)
		})

		it('kibibytes', () => {
			const result = toKibibytes(value)
			expect(result).toBe(1024 * 1024 * 1024 * 1024)
		})

		it('mebibytes', () => {
			const result = toMebibytes(value)
			expect(result).toBe(1024 * 1024 * 1024)
		})

		it('gibibytes', () => {
			const result = toGibibytes(value)
			expect(result).toBe(1024 * 1024)
		})

		it('tebibytes', () => {
			const result = toTebibytes(value)
			expect(result).toBe(1024)
		})

		it('pebibytes', () => {
			const result = toPebibytes(value)
			expect(result).toBe(1)
		})
	})

	describe('safe transform', () => {
		const value = pebibytes(1)

		it('bytes', () => {
			const result = toSafeBytes(value)
			expect(result).toBe(1024n * 1024n * 1024n * 1024n * 1024n)
		})

		it('kibibytes', () => {
			const result = toSafeKibibytes(value)
			expect(result).toBe(1024n * 1024n * 1024n * 1024n)
		})

		it('mebibytes', () => {
			const result = toSafeMebibytes(value)
			expect(result).toBe(1024n * 1024n * 1024n)
		})

		it('gibibytes', () => {
			const result = toSafeGibibytes(value)
			expect(result).toBe(1024n * 1024n)
		})

		it('tebibytes', () => {
			const result = toSafeTebibytes(value)
			expect(result).toBe(1024n)
		})

		it('pebibytes', () => {
			const result = toSafePebibytes(value)
			expect(result).toBe(1n)
		})
	})
})
