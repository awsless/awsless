import { Mock } from 'vitest';

declare const requestPort: ({ min, max, timeout, }?: {
    min?: number | undefined;
    max?: number | undefined;
    timeout?: number | undefined;
}) => Promise<[number, () => Promise<void>]>;

type Func = (...args: unknown[]) => unknown;
type Result<T extends string | number | symbol> = Record<T, Mock<any, Func>>;
declare const mockObjectValues: <T extends Record<string, Func>>(object: T) => Result<keyof T>;
declare const mockFn: <T extends Func>(fn: T) => Mock<any, any>;
declare const nextTick: (fn: Func, ...args: unknown[]) => Promise<unknown>;
declare const asyncCall: (fn: Func, ...args: unknown[]) => Promise<unknown>;

export { asyncCall, mockFn, mockObjectValues, nextTick, requestPort };
