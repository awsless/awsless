import { UUID } from 'node:crypto';
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

declare class Future<T = unknown> {
    protected callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void;
    protected listeners: Set<{
        resolve: (data: T) => void;
        reject?: (error: unknown) => void;
    }>;
    protected status: 0 | 1 | 2 | 3;
    protected data?: T;
    protected error?: unknown;
    constructor(callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void);
    get [Symbol.toStringTag](): string;
    pipe<N>(cb: (value: T) => N): Future<Awaited<N>>;
    then(resolve: (data: T) => void, reject?: (error: unknown) => void): void;
}

type Input<T = unknown> = T | Output<T> | Future<T> | Promise<T>;
type OptionalInput<T = unknown> = Input<T> | Input<T | undefined> | Input<undefined>;
type UnwrapInputArray<T extends Input[]> = {
    [K in keyof T]: UnwrapInput<T[K]>;
};
type UnwrapInput<T> = T extends Input<infer V> ? V : T;
declare const findInputDeps: (props: unknown) => Meta[];
declare const resolveInputs: <T>(inputs: T) => Promise<T>;

type OptionalOutput<T = unknown> = Output<T | undefined>;
declare class Output<T = unknown> extends Future<T> {
    readonly dependencies: Set<Meta>;
    constructor(dependencies: Set<Meta>, callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void);
    pipe<N>(cb: (value: T) => N): Output<Awaited<N>>;
}
declare const deferredOutput: <T>(cb: (resolve: (data: T) => void) => void) => Output<T>;
declare const output: <T>(value: T) => Output<T>;
declare const combine: <T extends Input[], R = UnwrapInputArray<T>>(...inputs: T) => Output<R>;
declare const resolve: <T extends [Input, ...Input[]], R>(inputs: T, transformer: (...inputs: UnwrapInputArray<T>) => R) => Output<Awaited<R>>;
declare const interpolate: (literals: TemplateStringsArray, ...placeholders: Input<any>[]) => Output<string>;

type ResourceConfig = Config & {
    /** Import an existing resource instead of creating a new resource. */
    import?: string;
    /** If true the resource will be retained in the backing cloud provider during a Pulumi delete operation. */
    retainOnDelete?: boolean;
};
type ResourceMeta<I extends State$1 = State$1, O extends State$1 = State$1> = Meta<'resource', I, O, ResourceConfig>;
type Resource<I extends State$1 = State$1, O extends State$1 = State$1> = O & {
    readonly $: ResourceMeta<I, O>;
};
type ResourceClass<I extends State$1 = State$1, O extends State$1 = State$1> = {
    new (parent: Group, id: string, props: I, config?: ResourceConfig): Resource<I, O>;
    get(parent: Group, id: string, physicalId: string): DataSource<I, O>;
};

declare class Stack extends Group {
    readonly app: App;
    readonly dependencies: Set<Stack>;
    constructor(app: App, name: string);
    dependsOn(...stacks: Stack[]): this;
}

type URN = `urn:${string}`;

type Tag = 'resource' | 'data';
type State$1 = Record<string, unknown>;
type Config = {
    /** Specify additional explicit dependencies in addition to the ones in the dependency graph. */
    dependsOn?: Resource<any, any>[];
    /** Pass an ID of an explicitly configured provider, instead of using the default provider. */
    provider?: string;
};
type Meta<T extends Tag = Tag, I extends State$1 = State$1, O extends State$1 = State$1, C extends Config = Config> = {
    readonly tag: T;
    readonly urn: URN;
    readonly logicalId: string;
    readonly type: string;
    readonly stack: Stack;
    readonly provider: string;
    readonly input: I;
    readonly config?: C;
    readonly dependencies: Set<URN>;
    readonly attachDependencies: (props: unknown) => void;
    readonly resolve: (data: O) => void;
    readonly output: <O>(cb: (data: State$1) => O) => Output<O>;
};

type DataSourceMeta<I extends State$1 = State$1, O extends State$1 = State$1> = Meta<'data', I, O>;
type DataSource<I extends State$1 = State$1, O extends State$1 = State$1> = {
    readonly $: DataSourceMeta<I, O>;
} & O;
type DataSourceFunction<I extends State$1 = State$1, O extends State$1 = State$1> = (parent: Group, id: string, input: I, config?: Config) => DataSource<I, O>;

type Node<T extends Tag = Tag, I extends State$1 = State$1, O extends State$1 = State$1, C extends Config = Config> = {
    $: Meta<T, I, O, C>;
} & O;

declare class Group {
    readonly parent: Group | undefined;
    readonly type: string;
    readonly name: string;
    protected children: Array<Group | Node>;
    constructor(parent: Group | undefined, type: string, name: string);
    get urn(): URN;
    protected addChild(child: Group | Node): void;
    add(...children: Array<Group | Node>): void;
    get nodes(): Node[];
    get resources(): Resource[];
    get dataSources(): DataSource[];
}

declare class App extends Group {
    readonly name: string;
    constructor(name: string);
    get stacks(): Stack[];
}

declare const enableDebug: () => void;
declare const createDebugger: (group: string) => (...args: unknown[]) => void;

interface LockBackend {
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

type AppState = {
    name: string;
    version?: number;
    idempotentToken?: UUID;
    stacks: Record<URN, StackState>;
};
type StackState = {
    name: string;
    nodes: Record<URN, NodeState>;
};
type NodeState = {
    tag: 'resource' | 'data';
    type: string;
    version?: number;
    provider: string;
    input: State$1;
    output: State$1;
    dependencies: URN[];
    lifecycle?: {
        retainOnDelete?: boolean;
        deleteAfterCreate?: boolean;
    };
};

type StateBackend = {
    get(urn: URN): Promise<AppState | undefined>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
};

type CreateProps<T = State$1> = {
    type: string;
    state: T;
    idempotantToken?: string;
};
type UpdateProps<T = State$1> = {
    type: string;
    priorState: T;
    proposedState: T;
    idempotantToken?: string;
};
type DeleteProps<T = State$1> = {
    type: string;
    state: T;
    idempotantToken?: string;
};
type GetProps<T = State$1> = {
    type: string;
    state: T;
};
type GetDataProps<T = State$1> = {
    type: string;
    state: T;
};
interface Provider {
    ownResource(id: string): boolean;
    getResource(props: GetProps): Promise<{
        version: number;
        state: State$1;
    }>;
    createResource(props: CreateProps): Promise<{
        version: number;
        state: State$1;
    }>;
    updateResource(props: UpdateProps): Promise<{
        version: number;
        state: State$1;
    }>;
    deleteResource(props: DeleteProps): Promise<void>;
    getData?(props: GetDataProps): Promise<{
        state: State$1;
    }>;
    destroy?(): Promise<void>;
}

type ProcedureOptions = {
    filters?: string[];
    idempotentToken?: UUID;
};
type WorkSpaceOptions = {
    providers: Provider[];
    concurrency?: number;
    backend: {
        state: StateBackend;
        lock: LockBackend;
    };
};
declare class WorkSpace {
    protected props: WorkSpaceOptions;
    constructor(props: WorkSpaceOptions);
    deploy(app: App, options?: ProcedureOptions): Promise<void>;
    delete(app: App, options?: ProcedureOptions): Promise<void>;
    hydrate(app: App): Promise<void>;
    protected destroyProviders(): Promise<void>;
}

type ResourceOperation = 'create' | 'update' | 'delete' | 'import' | 'resolve' | 'get';

declare class ResourceError extends Error {
    readonly urn: URN;
    readonly type: string;
    readonly operation: ResourceOperation;
    static wrap(urn: URN, type: string, operation: ResourceOperation, error: unknown): ResourceError;
    constructor(urn: URN, type: string, operation: ResourceOperation, message: string);
}
declare class AppError extends Error {
    readonly app: string;
    readonly issues: (ResourceError | Error)[];
    constructor(app: string, issues: (ResourceError | Error)[], message: string);
}
declare class ResourceNotFound extends Error {
}
declare class ResourceAlreadyExists extends Error {
}

declare class MemoryStateBackend implements StateBackend {
    protected states: Map<`urn:${string}`, AppState>;
    get(urn: URN): Promise<AppState | undefined>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
    clear(): void;
}

declare class MemoryLockBackend implements LockBackend {
    protected locks: Map<`urn:${string}`, number>;
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
    clear(): void;
}

declare class FileStateBackend implements StateBackend {
    private props;
    constructor(props: {
        dir: string;
    });
    private stateFile;
    private mkdir;
    get(urn: URN): Promise<AppState | undefined>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

declare class FileLockBackend implements LockBackend {
    private props;
    constructor(props: {
        dir: string;
    });
    private lockFile;
    private mkdir;
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

type Props$1 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    bucket: string;
};
declare class S3StateBackend implements StateBackend {
    private props;
    protected client: S3Client;
    constructor(props: Props$1);
    get(urn: URN): Promise<any>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type Props = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    tableName: string;
};
declare class DynamoLockBackend implements LockBackend {
    private props;
    protected client: DynamoDB;
    constructor(props: Props);
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

declare const file: (path: string, encoding?: BufferEncoding) => Future<string>;
declare const hash: (path: string, algo?: string) => Future<string>;

declare global {
    var $resolve: typeof resolve;
    var $combine: typeof combine;
    var $interpolate: typeof interpolate;
    var $hash: typeof hash;
    var $file: typeof file;
}

type Version = `${number}.${number}.${number}` | 'latest';

type Property = {
    description?: string;
    required?: boolean;
    optional?: boolean;
    /** The computed field means that it could be computed by the server. */
    computed?: boolean;
    deprecated?: boolean;
    sensitive?: boolean;
} & ({
    type: 'string' | 'number' | 'boolean';
} | {
    type: 'array' | 'record';
    item: Property;
} | {
    type: 'object' | 'array-object';
    properties: Record<string, Property>;
} | {
    type: 'unknown';
});

type State = Record<string, unknown>;
type Plugin = Readonly<{
    schema: () => {
        provider: Property;
        resources: Record<string, Property>;
        dataSources: Record<string, Property>;
    };
    stop: () => Promise<void>;
    configure: (config: State) => Promise<void>;
    readResource: (type: string, state: State) => Promise<State>;
    readDataSource: (type: string, state: State) => Promise<State>;
    validateResource: (type: string, state: State) => Promise<void>;
    applyResourceChange: (type: string, priorState: State | null, proposedNewState: State | null) => Promise<State>;
}>;

declare class TerraformProvider implements Provider {
    private type;
    private id;
    private createPlugin;
    private config;
    private configured?;
    private plugin?;
    constructor(type: string, id: string, createPlugin: () => Promise<Plugin>, config: State$1);
    private configure;
    private prepare;
    destroy(): Promise<void>;
    ownResource(id: string): boolean;
    getResource({ type, state }: GetProps): Promise<{
        version: number;
        state: State;
    }>;
    createResource({ type, state }: CreateProps): Promise<{
        version: number;
        state: State;
    }>;
    updateResource({ type, priorState, proposedState }: UpdateProps): Promise<{
        version: number;
        state: State;
    }>;
    deleteResource({ type, state }: DeleteProps): Promise<void>;
    getData({ type, state }: GetDataProps): Promise<{
        state: State;
    }>;
    generateTypes(dir: string): Promise<void>;
}

type Global$1 = typeof globalThis;
type GlobalType$1<T> = T extends keyof Global$1 ? Global$1[T] : any;
type ProviderInput<T extends string, TT extends 'Provider'> = T extends keyof GlobalType$1<'$terraform'> ? TT extends keyof GlobalType$1<'$terraform'>[T] ? GlobalType$1<'$terraform'>[T][TT] : Record<string, unknown> : Record<string, unknown>;
type ProviderConfig = {
    id?: string;
    debug?: boolean;
};
declare class Terraform {
    private props;
    constructor(props: {
        providerLocation: string;
    });
    install<T extends string>(org: string, type: T, version?: Version): Promise<(input: ProviderInput<T, "Provider">, config?: ProviderConfig) => TerraformProvider>;
}

declare global {
    export namespace $terraform { }
}
type Global = typeof globalThis;
type GlobalType<T> = T extends keyof Global ? Global[T] : any;
declare namespace $ { }
declare const $: GlobalType<"$terraform">;

declare const createCustomResourceClass: <I extends State$1, O extends State$1>(providerId: string, resourceType: string) => ResourceClass<I, O>;

type CustomResourceProvider = Partial<{
    getResource?(props: Omit<GetProps, 'type'>): Promise<State$1>;
    updateResource?(props: Omit<UpdateProps, 'type'>): Promise<State$1>;
    createResource?(props: Omit<CreateProps, 'type'>): Promise<State$1>;
    deleteResource?(props: Omit<DeleteProps, 'type'>): Promise<void>;
    getData?(props: Omit<GetDataProps, 'type'>): Promise<State$1>;
}>;
declare const createCustomProvider: (providerId: string, resourceProviders: Record<string, CustomResourceProvider>) => Provider;

export { $, App, AppError, type CreateProps, type CustomResourceProvider, type DataSource, type DataSourceFunction, type DataSourceMeta, type DeleteProps, DynamoLockBackend, FileLockBackend, FileStateBackend, Future, type GetDataProps, type GetProps, Group, type Input, type LockBackend, MemoryLockBackend, MemoryStateBackend, type OptionalInput, type OptionalOutput, Output, type ProcedureOptions, type Provider, type Resource, ResourceAlreadyExists, type ResourceClass, type ResourceConfig, ResourceError, type ResourceMeta, ResourceNotFound, S3StateBackend, Stack, type StateBackend, Terraform, type URN, type UpdateProps, WorkSpace, type WorkSpaceOptions, createCustomProvider, createCustomResourceClass, createDebugger, deferredOutput, enableDebug, findInputDeps, output, resolveInputs };
