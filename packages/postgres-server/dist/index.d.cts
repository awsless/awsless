//#region src/postgres-server.d.ts
type PostgresServerOptions = {
  port?: number;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare class PostgresServer {
  private readonly options;
  readonly host = "127.0.0.1";
  private child;
  private dir;
  private stopping;
  private boundPort;
  constructor(options?: PostgresServerOptions);
  get port(): number;
  get url(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
}
//#endregion
export { PostgresServer, type PostgresServerOptions };