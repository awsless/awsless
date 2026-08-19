import { Mock } from "vitest";
//#region src/client.d.ts
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
//#endregion
//#region src/mock.d.ts
type Func = (...args: any[]) => any;
type Result<T extends string | number | symbol> = Record<T, Mock<Func>>;
declare const mockObjectValues: <T extends Record<string, Func>>(object: T) => Result<keyof T>;
declare const mockFn: <T extends Func>(fn: T) => Mock<T>;
declare const nextTick: (fn: Func, ...args: unknown[]) => Promise<unknown>;
//#endregion
export { globalClient, mockFn, mockObjectValues, nextTick };