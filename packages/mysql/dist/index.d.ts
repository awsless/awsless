import { Kysely, MigrationResult } from 'kysely';
import { PoolOptions } from 'mysql2';

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

type Options = {
    migrations?: Record<string, string>;
    version?: VersionArgs;
    debug?: boolean;
};
declare const mockMysql: ({ migrations, version, debug }?: Options) => void;

declare const mysqlClient: <T>(options: PoolOptions) => Kysely<T>;

declare const command: <T, U>(options: PoolOptions, callback: (client: Kysely<T>) => Promise<U>) => Promise<U>;
declare const migrate: <T>(migrations: Record<string, string>, options?: PoolOptions) => Promise<Record<string, MigrationResult[] | undefined>>;

export { command, migrate, mockMysql, mysqlClient };
