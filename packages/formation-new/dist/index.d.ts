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

declare class Stack extends Group {
    readonly app: App;
    readonly dependencies: Set<Stack>;
    constructor(app: App, name: string);
    dependsOn(...stacks: Stack[]): this;
}

type URN = `urn:${string}`;
type State$1 = Record<string, any>;
type ResourceConfig = {
    /** Specify additional explicit dependencies in addition to the ones in the dependency graph. */
    dependsOn?: Resource[];
    /** Import an existing resource instead of creating a new resource. */
    import?: string;
    /** If true the resource will be retained in the backing cloud provider during a Pulumi delete operation. */
    retainOnDelete?: boolean;
    /** Override the default create-before-delete behavior when replacing a resource. */
    deleteBeforeCreate?: boolean;
};
type ResourceMeta<I extends State$1 = State$1, O extends State$1 = State$1, T extends string = string> = {
    readonly tag: "resource";
    readonly urn: URN;
    readonly type: T;
    readonly stack: Stack;
    readonly provider: string;
    readonly input: I;
    readonly config?: ResourceConfig;
    readonly dependencies: Set<URN>;
    readonly resolve: (data: O) => void;
    readonly output: <O>(cb: (data: State$1) => O) => Output<O>;
};
type Resource<I extends State$1 = State$1, O extends State$1 = State$1, T extends string = string> = O & {
    readonly $: ResourceMeta<I, O, T>;
};
type ResourceClass<I extends State$1 = State$1, O extends State$1 = State$1, T extends string = string> = {
    new (parent: Group, id: string, props: I, config?: ResourceConfig): Resource<I, O, T>;
    get(parent: Group, id: string, physicalId: string): DataSource<O, T>;
};
declare const createResourceMeta: <I extends State$1 = State$1, O extends State$1 = State$1, T extends string = string>(provider: string, parent: Group, type: T, id: string, input: I, config?: ResourceConfig) => ResourceMeta<I, O, T>;

type Input<T = unknown> = T | Output<T> | Future<T> | Promise<T>;
type UnwrapInputArray<T extends Input[]> = {
    [K in keyof T]: UnwrapInput<T[K]>;
};
type UnwrapInput<T> = T extends Input<infer V> ? V : T;

declare class Output<T = unknown> extends Future<T> {
    readonly dependencies: Set<ResourceMeta | DataSourceMeta>;
    constructor(dependencies: Set<ResourceMeta | DataSourceMeta>, callback: (resolve: (data: T) => void, reject: (error: unknown) => void) => void);
    pipe<N>(cb: (value: T) => N): Output<Awaited<N>>;
}
declare const deferredOutput: <T>(cb: (resolve: (data: T) => void) => void) => Output<T>;
declare const output: <T>(value: T) => Output<T>;
declare const combine: <T extends Input[], R = UnwrapInputArray<T>>(...inputs: T) => Output<R>;
declare const resolve: <T extends [Input, ...Input[]], R>(inputs: T, transformer: (...inputs: UnwrapInputArray<T>) => R) => Output<Awaited<R>>;
declare const interpolate: (literals: TemplateStringsArray, ...placeholders: Input<any>[]) => Output<string>;

type DataSourceMeta<O extends State$1 = State$1, T extends string = string> = {
    readonly tag: 'data-source';
    readonly urn: URN;
    readonly id: string;
    readonly physicalId: string;
    readonly stack: Stack;
    readonly type: T;
    readonly provider: string;
    readonly resolve: (data: O) => void;
    readonly output: <O>(cb: (data: State$1) => O) => Output<O>;
};
type DataSource<O extends State$1 = State$1, T extends string = string> = O & {
    readonly $: DataSourceMeta<O, T>;
};

declare class Group {
    readonly parent: Group | undefined;
    readonly type: string;
    readonly name: string;
    protected children: Array<Group | Resource | DataSource>;
    constructor(parent: Group | undefined, type: string, name: string);
    get urn(): URN;
    add(...children: Array<Group | Resource | DataSource>): void;
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
    idempotentToken?: UUID;
    stacks: Record<URN, StackState>;
};
type StackState = {
    name: string;
    dependencies: URN[];
    resources: Record<URN, ResourceState>;
};
type ResourceState = {
    type: string;
    version?: number;
    provider: string;
    input: State$1;
    output?: State$1;
    dependencies: URN[];
    lifecycle?: {
        retainOnDelete?: boolean;
        deleteBeforeCreate?: boolean;
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

type ResourceOperation = "create" | "update" | "delete" | "import" | "get";

declare class ResourceError extends Error {
    readonly urn: URN;
    readonly type: string;
    readonly operation: ResourceOperation;
    static wrap(urn: URN, type: string, operation: ResourceOperation, error: unknown): ResourceError;
    constructor(urn: URN, type: string, operation: ResourceOperation, message: string);
}
declare class AppError extends Error {
    readonly app: string;
    readonly issues: (StackError | Error)[];
    constructor(app: string, issues: (StackError | Error)[], message: string);
}
declare class StackError extends Error {
    readonly stack: string;
    readonly issues: (ResourceError | Error)[];
    constructor(stack: string, issues: (ResourceError | Error)[], message: string);
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
}

declare class MemoryLockBackend implements LockBackend {
    protected locks: Map<`urn:${string}`, number>;
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
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

type ProviderProps$1 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    bucket: string;
};
declare class S3StateBackend implements StateBackend {
    private props;
    protected client: S3Client;
    constructor(props: ProviderProps$1);
    get(urn: URN): Promise<any>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type ProviderProps = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    tableName: string;
};
declare class DynamoLockProvider implements LockBackend {
    private props;
    protected client: DynamoDB;
    constructor(props: ProviderProps);
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
    type: 'object';
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

declare global {
    interface TerraformProviders {
    }
}
declare class TerraformProvider implements Provider {
    private id;
    private createPlugin;
    private config;
    private configured?;
    private plugin?;
    constructor(id: string, createPlugin: () => Promise<Plugin>, config: State$1);
    private configure;
    private prepare;
    destroy(): Promise<void>;
    ownResource(id: string): boolean;
    getResource({ type, state }: GetProps): Promise<{
        version: number;
        state: {
            [x: string]: unknown;
        };
    }>;
    createResource({ type, state }: CreateProps): Promise<{
        version: number;
        state: {
            [x: string]: unknown;
        };
    }>;
    updateResource({ type, priorState, proposedState }: UpdateProps): Promise<{
        version: number;
        state: {
            [x: string]: unknown;
        };
    }>;
    deleteResource({ type, state }: DeleteProps): Promise<void>;
    getData({ type, state }: GetDataProps): Promise<{
        state: {
            [x: string]: unknown;
        };
    }>;
    generateTypes(dir: string): Promise<void>;
}

type ProviderConfig<T extends string> = T extends keyof TerraformProviders ? TerraformProviders[T] : Record<string, unknown>;
declare class Terraform {
    private props;
    constructor(props: {
        providerLocation: string;
    });
    install<T extends string>(org: string, type: T, version?: Version): Promise<(config: ProviderConfig<T>) => TerraformProvider>;
}

declare global {
    interface TerraformResources {
    }
}
declare const tf: TerraformResources;

export { App, AppError, type CreateProps, type DeleteProps, DynamoLockProvider, FileLockBackend, FileStateBackend, Future, type GetDataProps, type GetProps, Group, type Input, type LockBackend, MemoryLockBackend, MemoryStateBackend, Output, type ProcedureOptions, type Provider, type Resource, ResourceAlreadyExists, type ResourceClass, type ResourceConfig, ResourceError, ResourceNotFound, S3StateBackend, Stack, StackError, type State$1 as State, type StateBackend, Terraform, type URN, type UpdateProps, WorkSpace, type WorkSpaceOptions, createDebugger, createResourceMeta, deferredOutput, enableDebug, output, tf };
