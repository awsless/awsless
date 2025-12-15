declare class Duration {
    readonly value: bigint;
    constructor(value: bigint);
}
declare const years: (value: number | bigint) => Duration;
declare const weeks: (value: number | bigint) => Duration;
declare const days: (value: number | bigint) => Duration;
declare const hours: (value: number | bigint) => Duration;
declare const minutes: (value: number | bigint) => Duration;
declare const seconds: (value: number | bigint) => Duration;
declare const milliSeconds: (value: number | bigint) => Duration;
declare const toYears: (duration: Duration) => number;
declare const toWeeks: (duration: Duration) => number;
declare const toDays: (duration: Duration) => number;
declare const toHours: (duration: Duration) => number;
declare const toMinutes: (duration: Duration) => number;
declare const toSeconds: (duration: Duration) => number;
declare const toMilliSeconds: (duration: Duration) => number;
declare const toSafeYears: (duration: Duration) => bigint;
declare const toSafeWeeks: (duration: Duration) => bigint;
declare const toSafeDays: (duration: Duration) => bigint;
declare const toSafeHours: (duration: Duration) => bigint;
declare const toSafeMinutes: (duration: Duration) => bigint;
declare const toSafeSeconds: (duration: Duration) => bigint;
declare const toSafeMilliSeconds: (duration: Duration) => bigint;

type DurationUnit = 'millisecond' | 'milliseconds' | 'second' | 'seconds' | 'minute' | 'minutes' | 'hour' | 'hours' | 'day' | 'days' | 'week' | 'weeks' | 'year' | 'years';
type DurationFormat = `${number} ${DurationUnit}`;
declare const parse: (value: DurationFormat) => Duration;

export { Duration, type DurationFormat, type DurationUnit, days, hours, milliSeconds, minutes, parse, seconds, toDays, toHours, toMilliSeconds, toMinutes, toSafeDays, toSafeHours, toSafeMilliSeconds, toSafeMinutes, toSafeSeconds, toSafeWeeks, toSafeYears, toSeconds, toWeeks, toYears, weeks, years };
