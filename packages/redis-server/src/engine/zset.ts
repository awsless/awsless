export type ZEntry = { member: string; score: number }

// Members are latin1 byte strings, so plain string comparison is a byte compare.
export const compareMembers = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const compareEntries = (a: ZEntry, b: ZEntry): number => {
	if (a.score !== b.score) {
		return a.score < b.score ? -1 : 1
	}

	return compareMembers(a.member, b.member)
}

// A sorted array plus a score index. Inserts are O(n) but test workloads are
// tiny and it keeps rank and range queries trivially correct.
export class SortedSet {
	private scores = new Map<string, number>()
	private list: ZEntry[] = []

	get size() {
		return this.list.length
	}

	has(member: string) {
		return this.scores.has(member)
	}

	score(member: string) {
		return this.scores.get(member)
	}

	entries(): readonly ZEntry[] {
		return this.list
	}

	at(index: number): ZEntry | undefined {
		return this.list[index]
	}

	add(member: string, score: number): boolean {
		const existing = this.scores.get(member)

		if (existing !== undefined) {
			if (existing === score) {
				return false
			}

			this.list.splice(this.indexOf(member, existing), 1)
		}

		this.scores.set(member, score)
		const entry = { member, score }
		this.list.splice(this.lowerBoundEntry(entry), 0, entry)

		return existing === undefined
	}

	remove(member: string): boolean {
		const score = this.scores.get(member)

		if (score === undefined) {
			return false
		}

		this.list.splice(this.indexOf(member, score), 1)
		this.scores.delete(member)

		return true
	}

	rank(member: string): number | undefined {
		const score = this.scores.get(member)

		if (score === undefined) {
			return undefined
		}

		return this.indexOf(member, score)
	}

	private indexOf(member: string, score: number) {
		return this.lowerBoundEntry({ member, score })
	}

	private lowerBoundEntry(entry: ZEntry) {
		let lo = 0
		let hi = this.list.length

		while (lo < hi) {
			const mid = (lo + hi) >>> 1

			if (compareEntries(this.list[mid]!, entry) < 0) {
				lo = mid + 1
			} else {
				hi = mid
			}
		}

		return lo
	}

	// First index whose score is >= min (or > min when exclusive).
	scoreLowerBound(min: number, exclusive: boolean) {
		let lo = 0
		let hi = this.list.length

		while (lo < hi) {
			const mid = (lo + hi) >>> 1
			const score = this.list[mid]!.score

			if (exclusive ? score <= min : score < min) {
				lo = mid + 1
			} else {
				hi = mid
			}
		}

		return lo
	}

	// Index after the last entry whose score is <= max (or < max when exclusive).
	scoreUpperBound(max: number, exclusive: boolean) {
		let lo = 0
		let hi = this.list.length

		while (lo < hi) {
			const mid = (lo + hi) >>> 1
			const score = this.list[mid]!.score

			if (exclusive ? score < max : score <= max) {
				lo = mid + 1
			} else {
				hi = mid
			}
		}

		return lo
	}

	lexLowerBound(min: string, exclusive: boolean) {
		let lo = 0
		let hi = this.list.length

		while (lo < hi) {
			const mid = (lo + hi) >>> 1
			const cmp = compareMembers(this.list[mid]!.member, min)

			if (exclusive ? cmp <= 0 : cmp < 0) {
				lo = mid + 1
			} else {
				hi = mid
			}
		}

		return lo
	}

	lexUpperBound(max: string, exclusive: boolean) {
		let lo = 0
		let hi = this.list.length

		while (lo < hi) {
			const mid = (lo + hi) >>> 1
			const cmp = compareMembers(this.list[mid]!.member, max)

			if (exclusive ? cmp < 0 : cmp <= 0) {
				lo = mid + 1
			} else {
				hi = mid
			}
		}

		return lo
	}
}
