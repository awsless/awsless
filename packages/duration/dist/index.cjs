"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Duration: () => Duration,
  days: () => days,
  hours: () => hours,
  milliSeconds: () => milliSeconds,
  minutes: () => minutes,
  parse: () => parse,
  seconds: () => seconds,
  toDays: () => toDays,
  toHours: () => toHours,
  toMilliSeconds: () => toMilliSeconds,
  toMinutes: () => toMinutes,
  toSafeDays: () => toSafeDays,
  toSafeHours: () => toSafeHours,
  toSafeMilliSeconds: () => toSafeMilliSeconds,
  toSafeMinutes: () => toSafeMinutes,
  toSafeSeconds: () => toSafeSeconds,
  toSafeWeeks: () => toSafeWeeks,
  toSeconds: () => toSeconds,
  toWeeks: () => toWeeks,
  weeks: () => weeks
});
module.exports = __toCommonJS(index_exports);

// src/duration.ts
var SECONDS = 1000n;
var MINUTES = SECONDS * 60n;
var HOURS = MINUTES * 60n;
var DAYS = HOURS * 24n;
var WEEKS = DAYS * 7n;
var Duration = class {
  constructor(value) {
    this.value = value;
  }
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
    }
  }
  throw new SyntaxError(`Invalid duration: ${value}`);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  toSeconds,
  toWeeks,
  weeks
});
