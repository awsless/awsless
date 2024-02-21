enum Unit {
	kilo = 1024,
	mega = Unit.kilo * 1024,
	giga = Unit.mega * 1024,
}

export class Size {
	static bytes(value: number) {
		return new Size(value)
	}

	static kiloBytes(value: number) {
		return new Size(value * Unit.kilo)
	}

	static megaBytes(value: number) {
		return new Size(value * Unit.mega)
	}

	static gigaBytes(value: number) {
		return new Size(value * Unit.giga)
	}

	constructor(private bytes: number) {}

	toBytes() {
		return this.bytes
	}

	toKiloBytes() {
		return Math.floor(this.bytes / Unit.kilo)
	}

	toMegaBytes() {
		return Math.floor(this.bytes / Unit.mega)
	}

	toGigaBytes() {
		return Math.floor(this.bytes / Unit.giga)
	}
}
