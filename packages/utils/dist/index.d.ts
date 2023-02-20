import { Mock } from 'vitest';

type GlobalClient = {
    <Client>(factory: () => Client): {
        (): Client;
        set(client: Client): void;
    };
    <Client>(factory: () => Promise<Client>): {
        (): Promise<Client>;
        set(client: Client): void;
    };
};
declare const globalClient: GlobalClient;

type Func = (...args: unknown[]) => unknown;
type Result<T extends string | number | symbol> = Record<T, Mock<any, Func>>;
declare const mockObjectValues: <T extends Record<string, Func>>(object: T) => Result<keyof T>;
declare const mockFn: <T extends Func>(fn: T) => Mock<any, any>;
declare const nextTick: (fn: Func, ...args: unknown[]) => Promise<unknown>;

export { globalClient, mockFn, mockObjectValues, nextTick };
