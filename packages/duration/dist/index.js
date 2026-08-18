//#region src/duration.ts
const SECONDS = 1000n;
const MINUTES = SECONDS * 60n;
const HOURS = MINUTES * 60n;
const DAYS = HOURS * 24n;
const WEEKS = DAYS * 7n;
const YEARS = DAYS * 365n;
var Duration = class {
	value;
	constructor(value) {
		this.value = value;
	}
};
const years = (value) => {
	return new Duration(BigInt(value) * YEARS);
};
const weeks = (value) => {
	return new Duration(BigInt(value) * WEEKS);
};
const days = (value) => {
	return new Duration(BigInt(value) * DAYS);
};
const hours = (value) => {
	return new Duration(BigInt(value) * HOURS);
};
const minutes = (value) => {
	return new Duration(BigInt(value) * MINUTES);
};
const seconds = (value) => {
	return new Duration(BigInt(value) * SECONDS);
};
const milliSeconds = (value) => {
	return new Duration(BigInt(value));
};
const toYears = (duration) => {
	return Number(toSafeYears(duration));
};
const toWeeks = (duration) => {
	return Number(toSafeWeeks(duration));
};
const toDays = (duration) => {
	return Number(toSafeDays(duration));
};
const toHours = (duration) => {
	return Number(toSafeHours(duration));
};
const toMinutes = (duration) => {
	return Number(toSafeMinutes(duration));
};
const toSeconds = (duration) => {
	return Number(toSafeSeconds(duration));
};
const toMilliSeconds = (duration) => {
	return Number(toSafeMilliSeconds(duration));
};
const toSafeYears = (duration) => {
	return duration.value / YEARS;
};
const toSafeWeeks = (duration) => {
	return duration.value / WEEKS;
};
const toSafeDays = (duration) => {
	return duration.value / DAYS;
};
const toSafeHours = (duration) => {
	return duration.value / HOURS;
};
const toSafeMinutes = (duration) => {
	return duration.value / MINUTES;
};
const toSafeSeconds = (duration) => {
	return duration.value / SECONDS;
};
const toSafeMilliSeconds = (duration) => {
	return duration.value;
};
//#endregion
//#region src/parse.ts
const parse = (value) => {
	const [count, unit] = value.split(/\s+/);
	if (typeof count === "string" && typeof unit === "string") {
		const number = BigInt(count);
		if (unit.startsWith("millisecond")) return milliSeconds(number);
		else if (unit.startsWith("second")) return seconds(number);
		else if (unit.startsWith("minute")) return minutes(number);
		else if (unit.startsWith("hour")) return hours(number);
		else if (unit.startsWith("day")) return days(number);
		else if (unit.startsWith("week")) return weeks(number);
		else if (unit.startsWith("year")) return years(number);
	}
	throw new SyntaxError(`Invalid duration: ${value}`);
};
//#endregion
export { Duration, days, hours, milliSeconds, minutes, parse, seconds, toDays, toHours, toMilliSeconds, toMinutes, toSafeDays, toSafeHours, toSafeMilliSeconds, toSafeMinutes, toSafeSeconds, toSafeWeeks, toSafeYears, toSeconds, toWeeks, toYears, weeks, years };
