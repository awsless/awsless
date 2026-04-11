enum Unit {
	seconds = 1000,
	minutes = Unit.seconds * 60,
	hours = Unit.minutes * 60,
	days = Unit.hours * 24,
}

export class Duration {
	static milliseconds(value: number) {
		return new Duration(value)
	}

	static seconds(value: number) {
		return new Duration(value * Unit.seconds)
	}

	static minutes(value: number) {
		return new Duration(value * Unit.minutes)
	}

	static hours(value: number) {
		return new Duration(value * Unit.hours)
	}

	static days(value: number) {
		return new Duration(value * Unit.days)
	}

	constructor(private value: number) {}

	toMilliseconds() {
		return this.value
	}

	toSeconds() {
		return Math.floor(this.value / Unit.seconds)
	}

	toMinutes() {
		return Math.floor(this.value / Unit.minutes)
	}

	toHours() {
		return Math.floor(this.value / Unit.hours)
	}

	toDays() {
		return Math.floor(this.value / Unit.days)
	}
}
