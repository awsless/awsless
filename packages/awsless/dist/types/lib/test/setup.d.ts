import type { Mock } from 'vitest';
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
            domain: string;
        };
    };
};
export declare const mockBaselines: Map<Mock, (...args: unknown[]) => unknown>;
export declare const mockState: {
    inTest: boolean;
};
export declare const testRegistry: {
    emails: Record<string, Mock>;
    functions: Record<string, Mock>;
    tasks: Record<string, Mock>;
    queues: Record<string, Mock>;
    topics: Record<string, Mock>;
    pubsub: Record<string, Mock>;
    alerts: Record<string, Mock>;
    jobs: Record<string, Mock>;
    instances: Record<string, Mock>;
};
export declare const setupTestEnv: (manifest: TestManifest, options: {
    importFile: (file: string) => Promise<any>;
}) => Promise<void>;
