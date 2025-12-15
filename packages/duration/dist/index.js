// src/duration.ts
var SECONDS = 1000n;
var MINUTES = SECONDS * 60n;
var HOURS = MINUTES * 60n;
var DAYS = HOURS * 24n;
var WEEKS = DAYS * 7n;
var YEARS = DAYS * 365n;
var Duration = class {
  constructor(value) {
    this.value = value;
  }
};
var years = (value) => {
  return new Duration(BigInt(value) * YEARS);
};
var weeks = (value) => {
  return new Duration(BigInt(value) * WEEKS);
};
var days = (value) => {
  return new Duration(BigInt(value) * DAYS);
};
var hours = (value) => {
  return new Duration(BigInt(value) * HOURS);
};
var minutes = (value) => {
  return new Duration(BigInt(value) * MINUTES);
};
var seconds = (value) => {
  return new Duration(BigInt(value) * SECONDS);
};
var milliSeconds = (value) => {
  return new Duration(BigInt(value));
};
var toYears = (duration) => {
  return Number(toSafeYears(duration));
};
var toWeeks = (duration) => {
  return Number(toSafeWeeks(duration));
};
var toDays = (duration) => {
  return Number(toSafeDays(duration));
};
var toHours = (duration) => {
  return Number(toSafeHours(duration));
};
var toMinutes = (duration) => {
  return Number(toSafeMinutes(duration));
};
var toSeconds = (duration) => {
  return Number(toSafeSeconds(duration));
};
var toMilliSeconds = (duration) => {
  return Number(toSafeMilliSeconds(duration));
};
var toSafeYears = (duration) => {
  return duration.value / YEARS;
};
var toSafeWeeks = (duration) => {
  return duration.value / WEEKS;
};
var toSafeDays = (duration) => {
  return duration.value / DAYS;
};
var toSafeHours = (duration) => {
  return duration.value / HOURS;
};
var toSafeMinutes = (duration) => {
  return duration.value / MINUTES;
};
var toSafeSeconds = (duration) => {
  return duration.value / SECONDS;
};
var toSafeMilliSeconds = (duration) => {
  return duration.value;
};

// src/parse.ts
var parse = (value) => {
  const [count, unit] = value.split(/\s+/);
  if (typeof count === "string" && typeof unit === "string") {
    const number = BigInt(count);
    if (unit.startsWith("millisecond")) {
      return milliSeconds(number);
    } else if (unit.startsWith("second")) {
      return seconds(number);
    } else if (unit.startsWith("minute")) {
      return minutes(number);
    } else if (unit.startsWith("hour")) {
      return hours(number);
    } else if (unit.startsWith("day")) {
      return days(number);
    } else if (unit.startsWith("week")) {
      return weeks(number);
    } else if (unit.startsWith("year")) {
      return years(number);
    }
  }
  throw new SyntaxError(`Invalid duration: ${value}`);
};
export {
  Duration,
  days,
  hours,
  milliSeconds,
  minutes,
  parse,
  seconds,
  toDays,
  toHours,
  toMilliSeconds,
  toMinutes,
  toSafeDays,
  toSafeHours,
  toSafeMilliSeconds,
  toSafeMinutes,
  toSafeSeconds,
  toSafeWeeks,
  toSafeYears,
  toSeconds,
  toWeeks,
  toYears,
  weeks,
  years
};
