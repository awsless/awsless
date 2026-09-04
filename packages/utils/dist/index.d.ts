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
type Result<T extends Record<string, Func>> = { [K in keyof T]: Mock<T[K]>; };
type Vitest = (typeof import('vitest'))['vi'];
type MockFactory = Vitest['fn'];
declare const getVitest: (provided?: Vitest) => import("vitest").VitestUtils;
declare const mockObjectValues: <T extends Record<string, Func>>(object: T, createMock?: MockFactory) => Result<T>;
declare const mockFn: <T extends Func>(fn: T, createMock?: MockFactory) => Mock<T>;
declare const nextTick: (fn: Func, ...args: unknown[]) => Promise<unknown>;
//#endregion
export { getVitest, globalClient, mockFn, mockObjectValues, nextTick };