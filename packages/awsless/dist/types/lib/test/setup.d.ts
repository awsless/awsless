import type { TestMockFunction } from './mock.js';
export type TestManifest = {
    app: string;
    region: string;
    configs: Record<string, string>;
    tables: unknown[];
    tableKeys: {
        stack: string;
        id: string;
        keys: unknown;
    }[];
    streams: {
        stack: string;
        id: string;
        file: string;
        hash: string;
        sort?: string;
    }[];
    searches: {
        stack: string;
        id: string;
        mappings: unknown;
        settings?: unknown;
    }[];
    functions: {
        stack: string;
        id: string;
        file: string;
    }[];
    tasks: {
        stack: string;
        id: string;
        file: string;
    }[];
    crons?: {
        stack: string;
        id: string;
        file: string;
    }[];
    queues: {
        stack: string;
        id: string;
        file?: string;
    }[];
    topics: string[];
    pubsub: string[];
    caches: {
        stack: string;
        id: string;
    }[];
    alerts: string[];
    jobs: {
        stack: string;
        id: string;
    }[];
    instances: {
        stack: string;
        id: string;
    }[];
    servers?: {
        redis?: {
            host: string;
            port: number;
        };
        search?: {
            endpoint: string;
        };
    };
};
type ImportFile = (file: string) => Promise<any>;
export declare const mockBaselines: Map<TestMockFunction<(...args: any[]) => any>, (...args: unknown[]) => unknown>;
export declare const mockState: {
    inTest: boolean;
};
type Registry = Record<string, TestMockFunction>;
export declare const testRegistry: {
    emails: Registry;
    functions: Registry;
    crons: Registry;
    tasks: Registry;
    schedules: Registry;
    queues: Registry;
    topics: Registry;
    pubsub: Registry;
    alerts: Registry;
    jobs: Registry;
    instances: Registry;
};
export declare const setupTestEnv: (manifest: TestManifest, options: {
    importFile: ImportFile;
}) => Promise<void>;
export {};
