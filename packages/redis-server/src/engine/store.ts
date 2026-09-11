import { SortedSet } from './zset'

export type StringEntry = { type: 'string'; value: string }
export type ListEntry = { type: 'list'; value: string[] }
export type SetEntry = { type: 'set'; value: Set<string> }
export type ZSetEntry = { type: 'zset'; value: SortedSet }
// Field expiries live next to the hash because redis 7.4 scopes them per field.
export type HashEntry = { type: 'hash'; value: Map<string, string>; expires: Map<string, number> }
export type Entry = StringEntry | ListEntry | SetEntry | ZSetEntry | HashEntry
export type EntryType = Entry['type']

export const newHash = (): HashEntry => ({ type: 'hash', value: new Map(), expires: new Map() })

export class Database {
	private entries = new Map<string, Entry>()
	private expires = new Map<string, number>()
	// Bumped on every write so WATCH can detect changes without tracking clients.
	private versions = new Map<string, number>()
	generation = 0

	constructor(readonly index: number) {}

	get size() {
		return this.entries.size
	}

	get expireCount() {
		return this.expires.size
	}

	// Reads go through here so expired keys and hash fields vanish lazily.
	get(key: string, now: number): Entry | undefined {
		const expiry = this.expires.get(key)

		if (expiry !== undefined && expiry <= now) {
			this.delete(key)
			return undefined
		}

		const entry = this.entries.get(key)

		if (entry?.type === 'hash' && entry.expires.size > 0) {
			for (const [field, at] of entry.expires) {
				if (at <= now) {
					entry.expires.delete(field)
					entry.value.delete(field)
					this.touch(key)
				}
			}

			if (entry.value.size === 0) {
				this.delete(key)
				return undefined
			}
		}

		return entry
	}

	set(key: string, entry: Entry) {
		this.entries.set(key, entry)
		this.expires.delete(key)
		this.touch(key)
	}

	// Redis drops empty aggregates, so mutating commands call this afterwards.
	cleanup(key: string, entry: Entry) {
		this.touch(key)

		const empty =
			(entry.type === 'list' && entry.value.length === 0) ||
			(entry.type === 'set' && entry.value.size === 0) ||
			(entry.type === 'zset' && entry.value.size === 0) ||
			(entry.type === 'hash' && entry.value.size === 0)

		if (empty) {
			this.delete(key)
		}
	}

	delete(key: string): boolean {
		const existed = this.entries.delete(key)
		this.expires.delete(key)

		if (existed) {
			this.touch(key)
		}

		return existed
	}

	touch(key: string) {
		this.versions.set(key, (this.versions.get(key) ?? 0) + 1)
	}

	version(key: string) {
		return this.versions.get(key) ?? 0
	}

	expireAt(key: string): number | undefined {
		return this.expires.get(key)
	}

	setExpire(key: string, at: number) {
		this.expires.set(key, at)
		this.touch(key)
	}

	persist(key: string): boolean {
		const had = this.expires.delete(key)

		if (had) {
			this.touch(key)
		}

		return had
	}

	keys(): string[] {
		return [...this.entries.keys()]
	}

	flush() {
		this.entries.clear()
		this.expires.clear()
		this.versions.clear()
		this.generation++
	}

	// Moves the contents into another database, used by SWAPDB.
	swapWith(other: Database) {
		const entries = this.entries
		const expires = this.expires
		this.entries = other.entries
		this.expires = other.expires
		other.entries = entries
		other.expires = expires
		this.versions.clear()
		other.versions.clear()
		this.generation++
		other.generation++
	}

	sweep(now: number, limit = 200) {
		let removed = 0

		for (const [key, at] of this.expires) {
			if (at <= now) {
				this.delete(key)
				removed++
			}

			if (removed >= limit) {
				break
			}
		}

		for (const [key, entry] of this.entries) {
			if (entry.type === 'hash' && entry.expires.size > 0) {
				this.get(key, now)
			}
		}
	}
}
