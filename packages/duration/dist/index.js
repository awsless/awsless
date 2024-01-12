// src/duration.ts
var SECONDS = 1000n;
var MINUTES = SECONDS * 60n;
var HOURS = MINUTES * 60n;
var DAYS = HOURS * 24n;
var Duration = class {
  constructor(value) {
    this.value = value;
  }
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
var toDays = (duration) => {
  return duration.value / DAYS;
};
var toHours = (duration) => {
  return duration.value / HOURS;
};
var toMinutes = (duration) => {
  return duration.value / MINUTES;
};
var toSeconds = (duration) => {
  return duration.value / SECONDS;
};
var toMilliSeconds = (duration) => {
  return duration.value;
};

// src/parse.ts
var parse = (value) => {
  const [count, unit] = value.split(/\s+/);
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
  toSeconds
};
