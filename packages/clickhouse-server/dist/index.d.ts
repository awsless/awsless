//#region src/clickhouse-server.d.ts
type ClickHouseEngineKind = 'memory' | 'clickhouse';
type ClickHouseServerOptions = {
  host?: string;
  port?: number;
  engine?: ClickHouseEngineKind;
  debug?: boolean;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare class ClickHouseServer {
  readonly engine: ClickHouseEngineKind;
  private readonly memory;
  private readonly real;
  constructor(options?: ClickHouseServerOptions);
  get host(): string;
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
}
//#endregion
//#region src/memory/ast.d.ts
type Expr = ({
  kind: 'literal';
  value: unknown;
  text?: string;
} | {
  kind: 'identifier';
  parts: string[];
} | {
  kind: 'function';
  name: string;
  args: Expr[];
  params?: Expr[];
  distinct?: boolean;
  over?: boolean;
} | {
  kind: 'param';
  name: string;
  type: string;
} | {
  kind: 'asterisk';
  table?: string;
  except?: string[];
} | {
  kind: 'lambda';
  params: string[];
  body: Expr;
} | {
  kind: 'subquery';
  query: Query;
}) & {
  alias?: string;
};
type OrderItem = {
  expr: Expr;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
};
type TableSource = {
  kind: 'table';
  database?: string;
  name: string;
  alias?: string;
  final?: boolean;
} | {
  kind: 'subquery';
  query: Query;
  alias?: string;
  final?: boolean;
} | {
  kind: 'function';
  name: string;
  args: Expr[];
  alias?: string;
};
type Join = {
  kind: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  strictness?: 'ANY' | 'ALL';
  source: TableSource;
  on?: Expr;
  using?: string[];
};
type Select = {
  kind: 'select';
  with: {
    name: string;
    expr?: Expr;
    query?: Query;
  }[];
  distinct: boolean;
  columns: Expr[];
  from?: TableSource;
  joins: Join[];
  arrayJoin?: {
    exprs: Expr[];
    left: boolean;
  };
  where?: Expr;
  prewhere?: Expr;
  groupBy: Expr[];
  withTotals: boolean;
  having?: Expr;
  orderBy: OrderItem[];
  limitBy?: {
    limit: number;
    offset: number;
    exprs: Expr[];
  };
  limit?: number;
  offset?: number;
  settings: Record<string, unknown>;
};
type Query = {
  kind: 'union';
  selects: Select[];
  distinct: boolean[];
};
type IndexDef = {
  name: string;
  expr: Expr;
  type: string;
  granularity: number;
};
//#endregion
//#region src/memory/values.d.ts
declare class DateTimeValue {
  readonly ms: number;
  readonly scale: number;
  readonly timeZone?: string | undefined;
  constructor(ms: number, scale: number, timeZone?: string | undefined);
}
declare class DateValue {
  readonly days: number;
  readonly wide: boolean;
  constructor(days: number, wide?: boolean);
}
declare class TupleValue {
  readonly items: Value[];
  readonly names?: string[] | undefined;
  constructor(items: Value[], names?: string[] | undefined);
}
declare class IntervalValue {
  readonly unit: IntervalUnit;
  readonly count: number;
  constructor(unit: IntervalUnit, count: number);
}
type IntervalUnit = 'Nanosecond' | 'Microsecond' | 'Millisecond' | 'Second' | 'Minute' | 'Hour' | 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year';
type Value = string | number | bigint | boolean | null | Value[] | DateTimeValue | DateValue | TupleValue | IntervalValue | Map<Value, Value> | {
  [key: string]: unknown;
};
//#endregion
//#region src/memory/types.d.ts
type DataType = {
  name: 'Nullable';
  inner: DataType;
} | {
  name: 'LowCardinality';
  inner: DataType;
} | {
  name: 'Array';
  inner: DataType;
} | {
  name: 'Map';
  key: DataType;
  value: DataType;
} | {
  name: 'Tuple';
  items: DataType[];
  names?: string[];
} | {
  name: 'Enum8' | 'Enum16';
  values: [string, number][];
} | {
  name: 'DateTime';
  timeZone?: string;
} | {
  name: 'DateTime64';
  scale: number;
  timeZone?: string;
} | {
  name: 'Decimal';
  precision: number;
  scale: number;
} | {
  name: 'FixedString';
  length: number;
} | {
  name: 'Interval';
  unit: string;
} | {
  name: SimpleType;
};
type SimpleType = 'Int8' | 'Int16' | 'Int32' | 'Int64' | 'Int128' | 'Int256' | 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64' | 'UInt128' | 'UInt256' | 'Float32' | 'Float64' | 'BFloat16' | 'String' | 'Bool' | 'UUID' | 'Date' | 'Date32' | 'IPv4' | 'IPv6' | 'JSON' | 'Dynamic' | 'Nothing';
//#endregion
//#region src/memory/catalog.d.ts
type Column = {
  name: string;
  type: DataType;
  defaultKind?: 'DEFAULT' | 'MATERIALIZED' | 'ALIAS' | 'EPHEMERAL';
  defaultExpr?: Expr;
  codec?: string;
  comment: string;
};
type Row = Record<string, Value>;
type Table = {
  database: string;
  name: string;
  columns: Column[];
  indexes: IndexDef[];
  engine: {
    name: string;
    args: Expr[];
  };
  partitionBy?: Expr;
  primaryKey?: Expr[];
  orderBy: Expr[];
  ttl?: Expr;
  settings: [string, unknown][];
  comment: string;
  rows: Row[];
  modifiedAt: number;
};
type Mutation = {
  database: string;
  table: string;
  id: string;
  command: string;
  createdAt: number;
};
declare class Catalog {
  readonly databases: Map<string, Map<string, Table>>;
  readonly mutations: Mutation[];
  database(name: string): Map<string, Table>;
  find(database: string, name: string): Table | undefined;
  get(database: string, name: string, scope: string): Table;
  add(table: Table, ifNotExists: boolean, replace?: boolean): boolean;
  remove(database: string, name: string, ifExists: boolean): void;
  tables(): Table[];
  clear(): void;
}
//#endregion
//#region src/memory/evaluate.d.ts
type QueryResult = {
  columns: {
    name: string;
    type?: DataType;
  }[];
  rows: Value[][];
};
//#endregion
//#region src/memory/engine.d.ts
type ExecuteOptions = {
  params?: Record<string, string>;
  settings?: Record<string, unknown>;
  data?: string;
  database?: string;
};
type ExecuteResult = {
  result?: QueryResult;
  format?: string;
  settings: Record<string, unknown>;
  writtenRows: number;
  readRows: number;
};
declare class Engine {
  readonly catalog: Catalog;
  private mutationCount;
  reset(): void;
  execute(text: string, options?: ExecuteOptions): ExecuteResult;
  private context;
  private run;
  private frameOf;
  private tableScope;
  private rowValues;
  private createTable;
  private keyColumns;
  private column;
  private place;
  private alter;
  private mutation;
  private deleteRows;
  private optimize;
  private defaultFor;
  private insert;
  private writeRows;
}
//#endregion
//#region src/memory/server.d.ts
type MemoryClickHouseServerOptions = {
  host?: string;
  port?: number;
};
declare class MemoryClickHouseServer {
  private readonly options;
  readonly host: string;
  readonly engine: Engine;
  private server;
  private boundPort;
  constructor(options?: MemoryClickHouseServerOptions);
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  query(sql: string, params?: Record<string, string>): ExecuteResult;
  private handle;
  private send;
}
//#endregion
//#region src/real/download.d.ts
declare const download: () => Promise<string>;
//#endregion
//#region src/real/server.d.ts
type RealClickHouseServerOptions = {
  host?: string;
  port?: number;
  debug?: boolean;
  onExit?: (code: number | null, signal: string | null) => void;
  onOutput?: (line: string) => void;
};
declare class RealClickHouseServer {
  private readonly options;
  readonly host: string;
  private child;
  private dir;
  private stopping;
  private boundPort;
  constructor(options?: RealClickHouseServerOptions);
  get port(): number;
  get endpoint(): string;
  listen(port?: number): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  private query;
  private waitForReady;
}
//#endregion
//#region src/real/version.d.ts
declare const VERSION = "26.8.33.10";
//#endregion
export { type ClickHouseEngineKind, ClickHouseServer, type ClickHouseServerOptions, MemoryClickHouseServer, type MemoryClickHouseServerOptions, RealClickHouseServer, type RealClickHouseServerOptions, VERSION, download };