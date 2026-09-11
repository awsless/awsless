// Port of redis' stringmatchlen: * ? [abc] [^a] [a-z] and backslash escapes.
// Shared by KEYS, SCAN MATCH and PSUBSCRIBE so they agree on edge cases.
export const globMatch = (pattern: string, str: string): boolean => {
	let p = 0
	let s = 0

	while (p < pattern.length) {
		const c = pattern[p]

		if (c === '*') {
			while (pattern[p + 1] === '*') {
				p++
			}

			if (p + 1 === pattern.length) {
				return true
			}

			while (s <= str.length) {
				if (globMatch(pattern.slice(p + 1), str.slice(s))) {
					return true
				}

				s++
			}

			return false
		}

		if (s >= str.length) {
			return false
		}

		if (c === '?') {
			s++
			p++
			continue
		}

		if (c === '[') {
			p++
			const not = pattern[p] === '^'

			if (not) {
				p++
			}

			let matched = false

			while (p < pattern.length && pattern[p] !== ']') {
				const ch = pattern[p]

				if (ch === '\\' && p + 1 < pattern.length) {
					p++
					if (pattern[p] === str[s]) {
						matched = true
					}
				} else if (pattern[p + 1] === '-' && p + 2 < pattern.length) {
					let start = pattern.charCodeAt(p)
					let end = pattern.charCodeAt(p + 2)
					const code = str.charCodeAt(s)

					if (start > end) {
						const tmp = start
						start = end
						end = tmp
					}

					p += 2

					if (code >= start && code <= end) {
						matched = true
					}
				} else if (ch === str[s]) {
					matched = true
				}

				p++
			}

			if (not) {
				matched = !matched
			}

			if (!matched) {
				return false
			}

			s++
			p++
			continue
		}

		if (c === '\\' && p + 1 < pattern.length) {
			p++
		}

		if (pattern[p] !== str[s]) {
			return false
		}

		s++
		p++
	}

	return s === str.length
}
