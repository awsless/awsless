import { illegalArgument } from '../errors'

// Lucene's AUTO fuzziness: no edits for very short terms, one for 3-5
// characters, two above that.
export const resolveFuzziness = (fuzziness: unknown, term: string): number => {
	if (fuzziness === undefined || fuzziness === null) return 0

	if (typeof fuzziness === 'number') {
		if (fuzziness < 0 || fuzziness > 2 || !Number.isInteger(fuzziness)) {
			throw illegalArgument(`Valid edit distances are [0, 1, 2] but was [${fuzziness}]`)
		}
		return fuzziness
	}

	if (typeof fuzziness === 'string') {
		const upper = fuzziness.toUpperCase()
		if (/^\d$/.test(upper)) return resolveFuzziness(Number(upper), term)

		const auto = /^AUTO(?::(\d+),(\d+))?$/.exec(upper)
		if (auto) {
			const low = auto[1] ? Number(auto[1]) : 3
			const high = auto[2] ? Number(auto[2]) : 6
			if (term.length < low) return 0
			if (term.length < high) return 1
			return 2
		}
	}

	throw illegalArgument(`fuzziness cannot be [${String(fuzziness)}]`)
}

// Optimal string alignment distance, capped at `max`, with an exact prefix
// requirement like Lucene's prefix_length.
export const editDistance = (a: string, b: string, max: number, prefixLength = 0, transpositions = true): number => {
	if (prefixLength > 0) {
		if (a.length < prefixLength || b.length < prefixLength) return Infinity
		if (a.slice(0, prefixLength) !== b.slice(0, prefixLength)) return Infinity
		a = a.slice(prefixLength)
		b = b.slice(prefixLength)
	}

	if (Math.abs(a.length - b.length) > max) return Infinity
	if (a === b) return 0

	const rows: number[][] = []
	for (let i = 0; i <= a.length; i++) {
		rows.push(Array.from({ length: b.length + 1 }, () => 0))
		rows[i]![0] = i
	}
	for (let j = 0; j <= b.length; j++) rows[0]![j] = j

	for (let i = 1; i <= a.length; i++) {
		let rowMin = Infinity
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			let value = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost)
			if (transpositions && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				value = Math.min(value, rows[i - 2]![j - 2]! + 1)
			}
			rows[i]![j] = value
			rowMin = Math.min(rowMin, value)
		}
		if (rowMin > max) return Infinity
	}

	const distance = rows[a.length]![b.length]!
	return distance > max ? Infinity : distance
}
