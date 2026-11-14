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
declare const TRACE_ROOT = "1-5759e988-bd862e3fe1be46a994272793";
declare const TRACE_PARENT = "53995c3f42cd8ad8";
declare const mockTraceDaemon: (provided?: Vitest) => Promise<{
  segments: Record<string, any>[];
  received(count: number): Promise<Record<string, any>[]>;
  close(): void;
}>;
//#endregion
//#region src/trace.d.ts
type TraceAnnotations = Record<string, string | number | boolean>;
type SpanOptions = {
  namespace?: 'aws' | 'remote';
  annotations?: TraceAnnotations;
  metadata?: Record<string, string | number | boolean>;
  aws?: Record<string, string | number>;
  http?: {
    method?: string;
  };
};
type SpanEnd = {
  error?: boolean;
  fault?: boolean;
  throttle?: boolean;
  errorType?: string;
  aws?: Record<string, string | number>;
  http?: {
    status?: number;
  };
  metadata?: Record<string, string | number | boolean>;
};
type Span = {
  id: string;
  header: string;
  end(result?: SpanEnd): void;
};
type TraceHeader = {
  root: string;
  parent?: string;
  sampled: boolean;
  fields: string[];
};
declare const runTraceStep: <T>(fallback: T, callback: () => T) => T;
declare const parseTraceHeader: (header?: string) => TraceHeader | undefined;
declare const withTraceHeader: <T>(header: string | undefined, callback: () => T) => T;
declare const isTracing: () => boolean;
declare const startSpan: (name: string, options?: SpanOptions) => Span;
type TraceOptions<T> = SpanOptions & {
  endWith?: (result: Awaited<T>) => SpanEnd;
  endWithError?: (error: unknown) => SpanEnd;
};
declare const trace: <T>(name: string, callback: (span: Span) => T | Promise<T>, options?: TraceOptions<T>) => Promise<Awaited<T>>;
declare const flushTraces: () => Promise<void>;
declare const addTraceMiddleware: (client: unknown) => void;
//#endregion
export { type Span, type SpanEnd, type SpanOptions, TRACE_PARENT, TRACE_ROOT, type TraceAnnotations, type TraceOptions, addTraceMiddleware, flushTraces, getVitest, globalClient, isTracing, mockFn, mockObjectValues, mockTraceDaemon, nextTick, parseTraceHeader, runTraceStep, startSpan, trace, withTraceHeader };