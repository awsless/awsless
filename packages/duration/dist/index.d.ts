declare class Duration {
    readonly value: bigint;
    constructor(value: bigint);
}
declare const days: (value: number | bigint) => Duration;
declare const hours: (value: number | bigint) => Duration;
declare const minutes: (value: number | bigint) => Duration;
declare const seconds: (value: number | bigint) => Duration;
declare const milliSeconds: (value: number | bigint) => Duration;
declare const toDays: (duration: Duration) => bigint;
declare const toHours: (duration: Duration) => bigint;
declare const toMinutes: (duration: Duration) => bigint;
declare const toSeconds: (duration: Duration) => bigint;
declare const toMilliSeconds: (duration: Duration) => bigint;

type DurationUnit = 'millisecond' | 'milliseconds' | 'second' | 'seconds' | 'minute' | 'minutes' | 'hour' | 'hours' | 'day' | 'days';
type DurationFormat = `${number} ${DurationUnit}`;
declare const parse: (value: DurationFormat) => Duration;

export { Duration, DurationFormat, DurationUnit, days, hours, milliSeconds, minutes, parse, seconds, toDays, toHours, toMilliSeconds, toMinutes, toSeconds };
