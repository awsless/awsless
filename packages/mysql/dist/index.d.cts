import { Kysely, MigrationResult } from "kysely";
import { PoolOptions } from "mysql2";
//#region src/server/version.d.ts
type Version = `${string}.${string}.${string}`;
type VersionArgs = {
  version: Version;
  settings: (opts: {
    port: number;
    host: string;
    cacheDir: string;
  }) => Record<string, string | number | boolean>;
  started: (line: string) => boolean;
};
//#endregion
//#region src/mock.d.ts
type Options = {
  migrations?: Record<string, string>;
  version?: VersionArgs;
  debug?: boolean;
};
declare const mockMysql: ({ migrations, version, debug }?: Options) => void;
//#endregion
//#region src/client.d.ts
declare const mysqlClient: <T>(options: PoolOptions) => Kysely<T>;
//#endregion
//#region src/commands.d.ts
declare const command: <T, U>(options: PoolOptions, callback: (client: Kysely<T>) => Promise<U>) => Promise<U>;
declare const migrate: <T>(migrations: Record<string, string>, options?: PoolOptions) => Promise<Record<string, MigrationResult[] | undefined>>;
//#endregion
export { command, migrate, mockMysql, mysqlClient };