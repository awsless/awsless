const zero = BigInt(0)
const one = BigInt(1)
const two = BigInt(2)

/**
 * An iterative implementation of the extended euclidean algorithm or extended greatest common divisor algorithm.
 * Take positive integers a, b as input, and return a triple (g, x, y), such that ax + by = g = gcd(a, b).
 *
 * @param a
 * @param b
 *
 * @throws {RangeError}
 * This excepction is thrown if a or b are less than 0
 *
 * @returns A triple (g, x, y), such that ax + by = g = gcd(a, b).
 */
export function eGcd(a: bigint, b: bigint) {
	// if (typeof a === 'number') a = BigInt(a)
	// if (typeof b === 'number') b = BigInt(b)

	if (a <= zero || b <= zero) throw new RangeError('a and b MUST be > 0') // a and b MUST be positive

	let x = zero
	let y = one
	let u = one
	let v = zero

	while (a !== zero) {
		const q = b / a
		const r = b % a
		const m = x - u * q
		const n = y - v * q

		b = a
		a = r
		x = u
		y = v
		u = m
		v = n
	}

	return {
		g: b,
		x: x,
		y: y,
	}
}

export function modInv(a: bigint, n: bigint) {
	const egcd = eGcd(toZn(a, n), n)
	if (egcd.g !== one) {
		throw new RangeError(`${a.toString()} does not have inverse modulo ${n.toString()}`) // modular inverse does not exist
	} else {
		return toZn(egcd.x, n)
	}
}

export function abs(a: bigint) {
	return a >= 0 ? a : -a
}

export function toZn(a: bigint, n: bigint) {
	// if (typeof a === 'number') a = BigInt(a)
	// if (typeof n === 'number') n = BigInt(n)

	if (n <= zero) {
		throw new RangeError('n must be > 0')
	}

	const aZn = a % n
	return aZn < zero ? aZn + n : aZn
}

export function modPow(b: bigint, e: bigint, n: bigint): bigint {
	// if (typeof b === 'number') b = BigInt(b)
	// if (typeof e === 'number') e = BigInt(e)
	// if (typeof n === 'number') n = BigInt(n)

	if (n <= zero) {
		throw new RangeError('n must be > 0')
	} else if (n === one) {
		return zero
	}

	b = toZn(b, n)

	if (e < zero) {
		return modInv(modPow(b, abs(e), n), n)
	}

	let r = one
	while (e > 0) {
		if (e % two === one) {
			r = (r * b) % n
		}
		e = e / two
		b = b ** two % n
	}
	return r
}
