import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import * as zod from 'zod';
import { AnyZodObject, z } from 'zod';

type ProgramOptions = {
    configFile?: string;
    stage?: string;
    profile?: string;
    region?: string;
    mute?: boolean;
    verbose?: boolean;
};

type Credentials = AwsCredentialIdentityProvider;

type StackConfig$1 = {
    name: string;
    depends?: Array<StackConfig$1>;
};

declare const regions: readonly ["us-east-2", "us-east-1", "us-west-1", "us-west-2", "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"];
type Region = typeof regions[number];

type AssetRead = (name: string) => Promise<Buffer>;
type AssetWrite = (name: string, data: string | Buffer) => Promise<void>;
type AssetPublish = (name: string, data: string | Buffer, hash: string) => Promise<{
    bucket: string;
    key: string;
    version: string;
}>;
type BuildProps = {
    write: AssetWrite;
};
type PublishProps = {
    read: AssetRead;
    publish: AssetPublish;
};
type Metadata = Record<string, string>;
declare class Asset {
    readonly type: string;
    readonly id: string;
    constructor(type: string, id: string);
    build?(opt: BuildProps): Promise<Metadata | void> | Metadata | void;
    publish?(opt: PublishProps): Promise<Metadata | void> | Metadata | void;
}

type Permission = {
    effect?: 'Allow' | 'Deny';
    actions: string[];
    resources: string[];
};
interface Resource {
    readonly permissions?: Permission | Permission[];
}
declare abstract class Resource {
    readonly type: string;
    readonly children: Array<Resource | Asset>;
    readonly logicalId: string;
    private deps;
    constructor(type: string, logicalId: string, children?: Array<Resource | Asset>);
    dependsOn(...dependencies: Resource[]): this;
    protected attr(name: string, value: unknown): {
        [x: string]: unknown;
    };
    toJSON(): {
        [x: string]: {
            Type: string;
            DependsOn: string[];
            Properties: object;
        };
    };
    abstract properties(): object;
}
declare class Group {
    readonly children: Array<Resource | Asset>;
    constructor(children: Array<Resource | Asset>);
}

type ConstructorOf<C> = {
    new (...args: any[]): C;
};

declare class Stack {
    readonly name: string;
    readonly region: Region;
    readonly exports: Map<string, string>;
    readonly resources: Set<Resource>;
    readonly tags: Map<string, string>;
    readonly assets: Set<Asset>;
    constructor(name: string, region: Region);
    add(...resources: (Resource | Asset | Group)[]): this;
    export(name: string, value: string): this;
    import(name: string): string;
    tag(name: string, value: string): this;
    find<T>(resourceType: ConstructorOf<T>): T[];
    [Symbol.iterator](): IterableIterator<Resource>;
    get size(): number;
    toJSON(): {
        Resources: {};
        Outputs: {};
    };
    toString(pretty?: boolean): string;
}

declare class App {
    readonly name: string;
    readonly list: Map<string, Stack>;
    constructor(name: string);
    add(...stacks: Stack[]): this;
    find<T>(resourceType: ConstructorOf<T>): T[];
    [Symbol.iterator](): IterableIterator<Stack>;
    get stacks(): Stack[];
}

declare class Duration {
    private value;
    static milliseconds(value: number): Duration;
    static seconds(value: number): Duration;
    static minutes(value: number): Duration;
    static hours(value: number): Duration;
    static days(value: number): Duration;
    constructor(value: number);
    toMilliseconds(): number;
    toSeconds(): number;
    toMinutes(): number;
    toHours(): number;
    toDays(): number;
}

declare class Size {
    private bytes;
    static bytes(value: number): Size;
    static kiloBytes(value: number): Size;
    static megaBytes(value: number): Size;
    static gigaBytes(value: number): Size;
    constructor(bytes: number);
    toBytes(): number;
    toKiloBytes(): number;
    toMegaBytes(): number;
    toGigaBytes(): number;
}

interface ICode {
    toCodeJson: () => {
        Handler: string;
        Code: {
            S3Bucket: string;
            S3Key: string;
            S3ObjectVersion: string;
        };
    };
}

type FunctionProps = {
    code: ICode & Asset;
    name?: string;
    description?: string;
    runtime?: 'nodejs16.x' | 'nodejs18.x';
    architecture?: 'arm64' | 'x86_64';
    memorySize?: Size;
    timeout?: Duration;
    ephemeralStorageSize?: Size;
    environment?: Record<string, string>;
};
declare class Function extends Resource {
    private props;
    readonly name: string;
    private role;
    private policy;
    private environmentVariables;
    constructor(logicalId: string, props: FunctionProps);
    addPermissions(...permissions: (Permission | Permission[])[]): this;
    addEnvironment(name: string, value: string): this;
    get id(): string;
    get arn(): string;
    get permissions(): {
        actions: string[];
        resources: string[];
    };
    properties(): {
        EphemeralStorage: {
            Size: number;
        };
        Environment: {
            Variables: Record<string, string>;
        };
        Handler: string;
        Code: {
            S3Bucket: string;
            S3Key: string;
            S3ObjectVersion: string;
        };
        FunctionName: string;
        MemorySize: number;
        Runtime: "nodejs16.x" | "nodejs18.x";
        Timeout: number;
        Architectures: ("x86_64" | "arm64")[];
        Role: string;
    };
}

type Binding = (lambda: Function) => void;

type ExtendedConfigOutput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? BaseConfig & z.output<S> : BaseConfig);
type ExtendedConfigInput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? AppConfigInput & z.input<S> : AppConfigInput);
type StackContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    stack: Stack;
    stackConfig: ExtendedConfigOutput<S>['stacks'][number];
    bootstrap: Stack;
    usEastBootstrap: Stack;
    app: App;
    bind: (cb: Binding) => void;
};
type AppContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    bootstrap: Stack;
    usEastBootstrap: Stack;
    app: App;
    bind: (cb: Binding) => void;
};
type Plugin<S extends AnyZodObject | undefined = undefined> = {
    name: string;
    schema?: S;
    onApp?: (context: AppContext<S>) => void;
    onStack?: (context: StackContext<S>) => void;
};
declare const definePlugin: <S extends AnyZodObject | undefined = undefined>(plugin: Plugin<S>) => Plugin<S>;

declare const AppSchema: z.ZodObject<{
    name: z.ZodString;
    region: z.ZodEnum<["us-east-2", "us-east-1", "us-west-1", "us-west-2", "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"]>;
    profile: z.ZodString;
    stage: z.ZodDefault<z.ZodString>;
    defaults: z.ZodDefault<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    stacks: z.ZodEffects<z.ZodArray<z.ZodType<StackConfig$1, z.ZodTypeDef, StackConfig$1>, "many">, StackConfig$1[], StackConfig$1[]>;
    plugins: z.ZodOptional<z.ZodArray<z.ZodType<Plugin<z.AnyZodObject | undefined>, z.ZodTypeDef, Plugin<z.AnyZodObject | undefined>>, "many">>;
}, "strip", z.ZodTypeAny, {
    stacks: StackConfig$1[];
    name: string;
    region: "us-east-2" | "us-east-1" | "us-west-1" | "us-west-2" | "af-south-1" | "ap-east-1" | "ap-south-2" | "ap-southeast-3" | "ap-southeast-4" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-northeast-1" | "ca-central-1" | "eu-central-1" | "eu-west-1" | "eu-west-2" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-north-1" | "eu-central-2" | "me-south-1" | "me-central-1" | "sa-east-1";
    profile: string;
    stage: string;
    defaults: {};
    plugins?: Plugin<z.AnyZodObject | undefined>[] | undefined;
}, {
    stacks: StackConfig$1[];
    name: string;
    region: "us-east-2" | "us-east-1" | "us-west-1" | "us-west-2" | "af-south-1" | "ap-east-1" | "ap-south-2" | "ap-southeast-3" | "ap-southeast-4" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-northeast-1" | "ca-central-1" | "eu-central-1" | "eu-west-1" | "eu-west-2" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-north-1" | "eu-central-2" | "me-south-1" | "me-central-1" | "sa-east-1";
    profile: string;
    stage?: string | undefined;
    defaults?: {} | undefined;
    plugins?: Plugin<z.AnyZodObject | undefined>[] | undefined;
}>;
type AppConfigInput = z.input<typeof AppSchema>;
type AppConfigOutput = z.output<typeof AppSchema>;

declare const defaultPlugins: (Plugin<zod.ZodObject<{
    extend: zod.ZodOptional<zod.ZodType<(ctx: AppContext<undefined>) => void, zod.ZodTypeDef, (ctx: AppContext<undefined>) => void>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        extend: zod.ZodOptional<zod.ZodType<(ctx: StackContext<undefined>) => void, zod.ZodTypeDef, (ctx: StackContext<undefined>) => void>>;
    }, "strip", zod.ZodTypeAny, {
        extend?: ((ctx: StackContext<undefined>) => void) | undefined;
    }, {
        extend?: ((ctx: StackContext<undefined>) => void) | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        extend?: ((ctx: StackContext<undefined>) => void) | undefined;
    }[];
    extend?: ((ctx: AppContext<undefined>) => void) | undefined;
}, {
    stacks: {
        extend?: ((ctx: StackContext<undefined>) => void) | undefined;
    }[];
    extend?: ((ctx: AppContext<undefined>) => void) | undefined;
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        function: zod.ZodDefault<zod.ZodObject<{
            timeout: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodDefault<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
            memorySize: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodDefault<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodDefault<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            timeout: Duration;
            runtime: "nodejs16.x" | "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        }, {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        function: {
            timeout: Duration;
            runtime: "nodejs16.x" | "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        };
    }, {
        function?: {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        functions: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        functions?: Record<string, string | {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        functions?: Record<string, string | {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        functions?: Record<string, string | {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
    defaults: {
        function: {
            timeout: Duration;
            runtime: "nodejs16.x" | "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        };
    };
}, {
    stacks: {
        functions?: Record<string, string | {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
    defaults?: {
        function?: {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        crons: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            schedule: zod.ZodUnion<[zod.ZodType<`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)`, zod.ZodTypeDef, `rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)`>, zod.ZodEffects<zod.ZodType<`cron(${string} ${string} ${string} ${string} ${string} ${string})`, zod.ZodTypeDef, `cron(${string} ${string} ${string} ${string} ${string} ${string})`>, `cron(${string} ${string} ${string} ${string} ${string} ${string})`, `cron(${string} ${string} ${string} ${string} ${string} ${string})`>]>;
            payload: zod.ZodOptional<zod.ZodUnknown>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }> | undefined;
    }, {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }> | undefined;
    }[];
}, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            payload?: unknown;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        queue: zod.ZodDefault<zod.ZodObject<{
            retentionPeriod: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
        }, "strip", zod.ZodTypeAny, {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            receiveMessageWaitTime: Duration;
            maxMessageSize: Size;
        }, {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        queue: {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            receiveMessageWaitTime: Duration;
            maxMessageSize: Size;
        };
    }, {
        queue?: {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        } | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        queues: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            retentionPeriod: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
        }, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
        }> | undefined;
    }, {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
        }> | undefined;
    }[];
    defaults: {
        queue: {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            receiveMessageWaitTime: Duration;
            maxMessageSize: Size;
        };
    };
}, {
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        }> | undefined;
    }[];
    defaults?: {
        queue?: {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        } | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        tables: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodEffects<zod.ZodObject<{
            hash: zod.ZodString;
            sort: zod.ZodOptional<zod.ZodString>;
            fields: zod.ZodRecord<zod.ZodString, zod.ZodEnum<["string", "number", "binary"]>>;
            class: zod.ZodDefault<zod.ZodEnum<["standard", "standard-infrequent-access"]>>;
            pointInTimeRecovery: zod.ZodDefault<zod.ZodBoolean>;
            timeToLiveAttribute: zod.ZodOptional<zod.ZodString>;
            indexes: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
                hash: zod.ZodString;
                sort: zod.ZodOptional<zod.ZodString>;
                projection: zod.ZodDefault<zod.ZodEnum<["all", "keys-only"]>>;
            }, "strip", zod.ZodTypeAny, {
                hash: string;
                projection: "all" | "keys-only";
                sort?: string | undefined;
            }, {
                hash: string;
                sort?: string | undefined;
                projection?: "all" | "keys-only" | undefined;
            }>>>;
        }, "strip", zod.ZodTypeAny, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "all" | "keys-only";
                sort?: string | undefined;
            }> | undefined;
        }, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            sort?: string | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "all" | "keys-only" | undefined;
            }> | undefined;
        }>, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "all" | "keys-only";
                sort?: string | undefined;
            }> | undefined;
        }, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            sort?: string | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "all" | "keys-only" | undefined;
            }> | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "all" | "keys-only";
                sort?: string | undefined;
            }> | undefined;
        }> | undefined;
    }, {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            sort?: string | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "all" | "keys-only" | undefined;
            }> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "all" | "keys-only";
                sort?: string | undefined;
            }> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, "string" | "number" | "binary">;
            sort?: string | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "all" | "keys-only" | undefined;
            }> | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        stores: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
    }, "strip", zod.ZodTypeAny, {
        stores?: string[] | undefined;
    }, {
        stores?: string[] | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        stores?: string[] | undefined;
    }[];
}, {
    stacks: {
        stores?: string[] | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        topics: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        topics?: Record<string, string | {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        topics?: Record<string, string | {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        topics?: Record<string, string | {
            file: string;
            timeout?: Duration | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        topics?: Record<string, string | {
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        pubsub: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
            sql: zod.ZodString;
            sqlVersion: zod.ZodDefault<zod.ZodEnum<["2015-10-08", "2016-03-23", "beta"]>>;
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion: "2015-10-08" | "2016-03-23" | "beta";
        }, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion: "2015-10-08" | "2016-03-23" | "beta";
        }> | undefined;
    }, {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion: "2015-10-08" | "2016-03-23" | "beta";
        }> | undefined;
    }[];
}, {
    stacks: {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    domains: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodArray<zod.ZodObject<{
        name: zod.ZodOptional<zod.ZodString>;
        type: zod.ZodEnum<["A", "AAAA", "CAA", "CNAME", "DS", "MX", "NAPTR", "NS", "PTR", "SOA", "SPF", "SRV", "TXT"]>;
        ttl: zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>;
        records: zod.ZodArray<zod.ZodString, "many">;
    }, "strip", zod.ZodTypeAny, {
        type: "A" | "AAAA" | "CAA" | "CNAME" | "DS" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SPF" | "SRV" | "TXT";
        ttl: Duration;
        records: string[];
        name?: string | undefined;
    }, {
        type: "A" | "AAAA" | "CAA" | "CNAME" | "DS" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SPF" | "SRV" | "TXT";
        ttl: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined);
        records: string[];
        name?: string | undefined;
    }>, "many">>>;
}, "strip", zod.ZodTypeAny, {
    domains?: Record<string, {
        type: "A" | "AAAA" | "CAA" | "CNAME" | "DS" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SPF" | "SRV" | "TXT";
        ttl: Duration;
        records: string[];
        name?: string | undefined;
    }[]> | undefined;
}, {
    domains?: Record<string, {
        type: "A" | "AAAA" | "CAA" | "CNAME" | "DS" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SPF" | "SRV" | "TXT";
        ttl: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined);
        records: string[];
        name?: string | undefined;
    }[]> | undefined;
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        graphql: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
            domain: zod.ZodOptional<zod.ZodString>;
            subDomain: zod.ZodOptional<zod.ZodString>;
            authorization: zod.ZodOptional<zod.ZodObject<{
                authorizer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                    file: zod.ZodEffects<zod.ZodString, string, string>;
                    timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                    runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
                    memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                    ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                    environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
                }, "strip", zod.ZodTypeAny, {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }, {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }>]>;
                ttl: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            }, "strip", zod.ZodTypeAny, {
                ttl: Duration;
                authorizer: (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            }, {
                authorizer: (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            }>>;
            resolver: zod.ZodOptional<zod.ZodEffects<zod.ZodString, string, string>>;
        }, "strip", zod.ZodTypeAny, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                ttl: Duration;
                authorizer: (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            resolver?: string | undefined;
        }, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                authorizer: (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            } | undefined;
            resolver?: string | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        graphql?: Record<string, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                ttl: Duration;
                authorizer: (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    }, {
        graphql?: Record<string, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                authorizer: (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        graphql: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
            schema: zod.ZodOptional<zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodArray<zod.ZodEffects<zod.ZodString, string, string>, "many">]>>;
            resolvers: zod.ZodOptional<zod.ZodRecord<zod.ZodType<`${string} ${string}`, zod.ZodTypeDef, `${string} ${string}`>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs16.x", "nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>>>;
        }, "strip", zod.ZodTypeAny, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }> | undefined;
    }, {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: Duration | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }> | undefined;
    }[];
    defaults: {
        graphql?: Record<string, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                ttl: Duration;
                authorizer: (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    };
}, {
    stacks: {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Partial<Record<`${string} ${string}`, string | {
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>> | undefined;
        }> | undefined;
    }[];
    defaults?: {
        graphql?: Record<string, {
            domain?: string | undefined;
            subDomain?: string | undefined;
            authorization?: {
                authorizer: (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs16.x" | "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    } | undefined;
}>>)[];
type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>;

type BaseConfig = AppConfigOutput & {
    account: string;
    credentials: Credentials;
};
type AppConfigFactory<C = AppConfigInput> = (options: ProgramOptions) => C | Promise<C>;

declare const getLocalResourceName: (id: string, stack?: string) => string;
declare const getGlobalResourceName: (id: string) => string;
declare const getFunctionName: (id: string, stack?: string) => string;
declare const getTableName: (id: string, stack?: string) => string;
declare const getStoreName: (id: string, stack?: string) => string;
declare const getQueueName: (id: string, stack?: string) => string;
declare const getTopicName: (id: string) => string;

type AppConfig = CombinedDefaultPluginsConfigInput;
type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number];
declare const defineAppConfig: (config: AppConfig | AppConfigFactory<AppConfig>) => CombinedDefaultPluginsConfigInput | AppConfigFactory<CombinedDefaultPluginsConfigInput>;

export { AppConfig, Plugin, StackConfig, defineAppConfig, definePlugin, getFunctionName, getGlobalResourceName, getLocalResourceName, getQueueName, getStoreName, getTableName, getTopicName };
