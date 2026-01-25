export class VirtualClock {
	private offset: number = 0

	now(): number {
		return Date.now() + this.offset
	}

	nowInSeconds(): number {
		return Math.floor(this.now() / 1000)
	}

	advance(ms: number): void {
		this.offset += ms
	}

	set(timestamp: number): void {
		this.offset = timestamp - Date.now()
	}

	reset(): void {
		this.offset = 0
	}
}
