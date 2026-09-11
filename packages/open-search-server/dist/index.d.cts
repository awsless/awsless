//#region src/opensearch/launch.d.ts
type Settings = Record<string, string | number | boolean>;
type Options = {
  path: string;
  host: string;
  port: number;
  debug?: boolean;
  version: VersionArgs;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare const launch: ({ path, host, port, version, debug, onExit: onDied, onOutput }: Options) => Promise<() => Promise<void>>;
//#endregion
//#region src/opensearch/version.d.ts
type Version = `${string}.${string}.${string}`;
type VersionArgs = {
  version: Version;
  settings: (opts: {
    port: number;
    host: string;
    cache: string;
  }) => Settings;
  started: (line: string) => boolean;
};
declare const VERSION_3_5_0_MIN: VersionArgs;
//#endregion
//#region src/open-search-server.d.ts
type OpenSearchEngineKind = 'memory' | 'opensearch';
type OpenSearchServerOptions = {
  host?: string;
  port?: number;
  engine?: OpenSearchEngineKind;
  version?: VersionArgs;
  debug?: boolean;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare class OpenSearchServer {
  readonly engine: OpenSearchEngineKind;
  readonly host: string;
  private readonly memory;
  private readonly real;
  constructor(options?: OpenSearchServerOptions);
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
}
//#endregion
//#region src/server.d.ts
type MemoryOpenSearchServerOptions = {
  host?: string;
  port?: number;
};
declare class MemoryOpenSearchServer {
  readonly host: string;
  private readonly initialPort;
  private readonly store;
  private readonly routes;
  private readonly sockets;
  private server;
  private boundPort;
  constructor(options?: MemoryOpenSearchServerOptions);
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): void;
  private send;
  private handle;
}
//#endregion
//#region src/opensearch/real-server.d.ts
type RealOpenSearchServerOptions = {
  host?: string;
  port?: number;
  version?: VersionArgs;
  debug?: boolean;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare class RealOpenSearchServer {
  readonly host: string;
  private readonly options;
  private kill;
  private boundPort;
  constructor(options?: RealOpenSearchServerOptions);
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  private waitForReady;
}
//#endregion
//#region src/errors.d.ts
type ErrorCause = {
  type: string;
  reason: string;
};
declare class OpenSearchError extends Error {
  readonly type: string;
  readonly status: number;
  readonly reason: string;
  readonly rootCause: ErrorCause;
  readonly extra: Record<string, unknown>;
  constructor(type: string, status: number, reason: string, options?: {
    rootCause?: ErrorCause;
    extra?: Record<string, unknown>;
  });
  toBody(): {
    error: {
      root_cause: ErrorCause[];
      type: string;
      reason: string;
    };
    status: number;
  };
}
//#endregion
//#region src/opensearch/download.d.ts
declare const download: ({ version }: Pick<VersionArgs, 'version'>) => Promise<string>;
//#endregion
export { MemoryOpenSearchServer, type MemoryOpenSearchServerOptions, type OpenSearchEngineKind, OpenSearchError, OpenSearchServer, type OpenSearchServerOptions, RealOpenSearchServer, type RealOpenSearchServerOptions, VERSION_3_5_0_MIN, type VersionArgs, download, launch };