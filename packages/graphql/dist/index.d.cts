import { GraphQLSchema as GraphQLSchema$1 } from 'graphql';

declare class Arg<Type extends string = string, Value = unknown> {
    readonly type: Type;
    readonly value: Value;
    constructor(type: Type, value: Value);
}
declare const $: <Type extends string, Value extends unknown>(type: Type, value: Value) => Arg<Type, Value>;

type Request = {
    [field: string]: boolean | number | Request | Arg | unknown;
};
type Operation$1 = 'query' | 'mutation' | 'subscription';
declare function createQuery(operation: Operation$1, request: Request): {
    query: string;
    variables: Record<string, unknown>;
};

type Operation = {
    query: string;
    variables: {
        [name: string]: unknown;
    };
};
type Fetcher = (opt: Operation, props?: FetchProps) => unknown;
type FetcherOptions = {
    url: string;
    headers?: Record<string, string>;
};
type FetchProps = {
    fetch?: typeof fetch;
    headers?: Record<string, string>;
    signal?: AbortSignal;
};
declare const createFetcher: (optionsOrFunc: FetcherOptions | (() => FetcherOptions | Promise<FetcherOptions>)) => Fetcher;

type TupleLike = readonly [any, any];
type ArrayLike = any[];
type NeverLike = false | 0;
type UnionLike = {
    __union: any;
};
type ObjectLike = {};
type NilLike = undefined | null;
type Scalar = string | number | boolean | undefined;
type Anify<T> = {
    [P in keyof T]?: any;
};
type FieldsToRemove = '__union' | '__name' | '__args';
type Optional<T, R> = T extends undefined ? R | undefined : R;
type InferResponse<SRC extends Anify<DST> | undefined, DST> = {
    scalar: SRC;
    tuple: Optional<SRC, DST extends TupleLike ? SelectTuple<SRC, DST> : never>;
    union: Optional<SRC, SRC extends UnionLike ? SelectUnion<SRC, DST> : never>;
    array: Optional<SRC, SRC extends ArrayLike ? SelectArray<SRC, DST> : never>;
    object: Optional<SRC, SRC extends ObjectLike ? SelectObject<SRC, DST> : never>;
    never: never;
}[DST extends NilLike ? 'never' : SRC extends NilLike ? 'never' : DST extends TupleLike ? 'tuple' : DST extends NeverLike ? 'never' : SRC extends Scalar ? 'scalar' : SRC extends ArrayLike ? 'array' : SRC extends UnionLike ? 'union' : DST extends ObjectLike ? 'object' : 'never'];
type SelectTuple<SRC extends Anify<DST>, DST> = DST extends readonly [any, infer PAYLOAD] ? InferResponse<SRC, PAYLOAD> : never;
type SelectArray<SRC extends Anify<DST>, DST> = SRC extends (infer T)[] ? Array<InferResponse<T, DST>> : never;
type RenameAliases<Object> = {
    [Key in keyof Object as Key extends `${infer Alias}:${string}` ? Alias : Key]: Object[Key];
};
type SelectObject<SRC extends Anify<DST>, DST> = RenameAliases<Omit<{
    [Key in keyof DST]: Key extends keyof SRC ? InferResponse<SRC[Key], DST[Key]> : SRC[Key];
}, FieldsToRemove>>;
type UnionKey = `...on ${string}`;
type SelectUnion<SRC extends UnionLike, DST> = {
    [Resolver in keyof SRC['__union']]: RenameAliases<{
        [Key in keyof Omit<DST, FieldsToRemove | UnionKey>]: InferResponse<SRC['__union'][Resolver][Key], DST[Key]>;
    } & {
        [Key in keyof Omit<DST[Resolver], FieldsToRemove | UnionKey>]: InferResponse<SRC['__union'][Resolver][Key], DST[Resolver][Key]>;
    }>;
}[keyof SRC['__union']];

type RootSchema = {
    request: any;
    response: any;
};
type GraphQLSchema = {
    query: RootSchema;
    mutate: RootSchema;
};
type Client<S extends GraphQLSchema> = {
    [T in keyof S]: S[T] extends RootSchema ? <R extends S[T]['request'] & {
        __name?: string;
    }>(request: R, props?: FetchProps) => Promise<InferResponse<S[T]['response'], R>> : never;
};
declare const createClient: <S extends GraphQLSchema>(fetcher: Fetcher) => Client<S>;

type GraphQLErrorEntry = {
    path: (string | number)[] | null;
    errorType?: string;
    message: string;
    data?: unknown;
};
declare class GraphQLError extends Error {
    readonly errors: GraphQLErrorEntry[];
    constructor(errors: GraphQLErrorEntry[]);
}

type Config = {
    package?: string;
    scalarTypes?: {
        [k: string]: string;
    };
};

declare const generate: (schema: GraphQLSchema$1, config?: Config) => string;

export { $, Arg, Client, Fetcher, GraphQLError, GraphQLSchema, RootSchema, createClient, createFetcher, createQuery, generate };
