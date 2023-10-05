import * as zod from 'zod';
import { z, AnyZodObject } from 'zod';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

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

declare const regions: readonly ["us-east-2", "us-east-1", "us-west-1", "us-west-2", "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"];
type Region = typeof regions[number];

type ConstructorOf<C> = {
    new (...args: any[]): C;
};

declare class App {
    readonly name: string;
    private list;
    constructor(name: string);
    add(...stacks: Stack[]): this;
    find<T>(resourceType: ConstructorOf<T>): T[];
    [Symbol.iterator](): IterableIterator<Stack>;
    get stacks(): Stack[];
}

declare class Stack {
    readonly name: string;
    readonly region: Region;
    private parent?;
    readonly exports: Map<string, string>;
    readonly resources: Set<Resource>;
    readonly tags: Map<string, string>;
    readonly assets: Set<Asset>;
    constructor(name: string, region: Region);
    get app(): App | undefined;
    setApp(app: App): this;
    add(...resources: (Resource | Asset | Group)[]): this;
    export(name: string, value: string): this;
    get(name: string): string;
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
    readonly tags: Map<string, string>;
    protected deps: Set<Resource>;
    protected stack: Stack | undefined;
    constructor(type: string, logicalId: string, children?: Array<Resource | Asset>);
    addChild(...children: Resource[]): this;
    dependsOn(...dependencies: Resource[]): this;
    tag(key: string, value: string): this;
    protected attr(name: string, value: unknown): {
        [x: string]: unknown;
    };
    setStack(stack: Stack): this;
    protected ref(): string;
    protected getAtt<T = string>(attr: string): T;
    toJSON(): {
        [x: string]: {
            Type: string;
            DependsOn: string[];
            Properties: {
                Tags?: {
                    Key: string;
                    Value: string;
                }[] | undefined;
            };
        };
    };
    abstract properties(): object;
}
declare class Group {
    readonly children: Array<Resource | Asset>;
    constructor(children: Array<Resource | Asset>);
}

type HttpRequestMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

type RouteFormat = `${HttpRequestMethod} /${string}` | '$default';

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

declare const AppSchema: z.ZodObject<{
    /** App name */
    name: z.ZodEffects<z.ZodString, string, string>;
    /** The AWS region to deploy to. */
    region: z.ZodEnum<["us-east-2", "us-east-1", "us-west-1", "us-west-2", "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"]>;
    /** The AWS profile to deploy to. */
    profile: z.ZodString;
    /** The deployment stage.
     * @default 'prod'
     */
    stage: z.ZodDefault<z.ZodString>;
    /** Default properties. */
    defaults: z.ZodDefault<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    /** The application stacks. */
    stacks: z.ZodEffects<z.ZodArray<z.ZodType<StackConfig$1, z.ZodTypeDef, StackConfig$1>, "many">, StackConfig$1[], StackConfig$1[]>;
    /** Custom plugins. */
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
}>> | Plugin<undefined> | Plugin<zod.ZodObject<{
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
        function: zod.ZodDefault<zod.ZodObject<{
            vpc: zod.ZodDefault<zod.ZodBoolean>;
            log: zod.ZodDefault<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodDefault<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodDefault<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodDefault<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            vpc: boolean;
            log: (boolean | Duration) & (boolean | Duration | undefined);
            timeout: Duration;
            runtime: "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        function: {
            vpc: boolean;
            log: (boolean | Duration) & (boolean | Duration | undefined);
            timeout: Duration;
            runtime: "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        };
    }, {
        function?: {
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        functions: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            vpc: zod.ZodOptional<zod.ZodBoolean>;
            log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        functions?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        functions?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        functions?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
    defaults: {
        function: {
            vpc: boolean;
            log: (boolean | Duration) & (boolean | Duration | undefined);
            timeout: Duration;
            runtime: "nodejs18.x";
            memorySize: Size;
            architecture: "x86_64" | "arm64";
            ephemeralStorageSize: Size;
            retryAttempts: number;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        };
    };
}, {
    stacks: {
        functions?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
    defaults?: {
        function?: {
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        configs: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
    }, "strip", zod.ZodTypeAny, {
        configs?: string[] | undefined;
    }, {
        configs?: string[] | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        configs?: string[] | undefined;
    }[];
}, {
    stacks: {
        configs?: string[] | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        caches: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            type: zod.ZodDefault<zod.ZodEnum<["t4g.small", "t4g.medium", "r6g.large", "r6g.xlarge", "r6g.2xlarge", "r6g.4xlarge", "r6g.8xlarge", "r6g.12xlarge", "r6g.16xlarge", "r6gd.xlarge", "r6gd.2xlarge", "r6gd.4xlarge", "r6gd.8xlarge"]>>;
            port: zod.ZodDefault<zod.ZodNumber>;
            shards: zod.ZodDefault<zod.ZodNumber>;
            replicasPerShard: zod.ZodDefault<zod.ZodNumber>;
            engine: zod.ZodDefault<zod.ZodEnum<["7.0", "6.2"]>>;
            dataTiering: zod.ZodDefault<zod.ZodBoolean>;
        }, "strip", zod.ZodTypeAny, {
            type: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge";
            port: number;
            shards: number;
            replicasPerShard: number;
            engine: "7.0" | "6.2";
            dataTiering: boolean;
        }, {
            type?: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge" | undefined;
            port?: number | undefined;
            shards?: number | undefined;
            replicasPerShard?: number | undefined;
            engine?: "7.0" | "6.2" | undefined;
            dataTiering?: boolean | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        caches?: Record<string, {
            type: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge";
            port: number;
            shards: number;
            replicasPerShard: number;
            engine: "7.0" | "6.2";
            dataTiering: boolean;
        }> | undefined;
    }, {
        caches?: Record<string, {
            type?: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge" | undefined;
            port?: number | undefined;
            shards?: number | undefined;
            replicasPerShard?: number | undefined;
            engine?: "7.0" | "6.2" | undefined;
            dataTiering?: boolean | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        caches?: Record<string, {
            type: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge";
            port: number;
            shards: number;
            replicasPerShard: number;
            engine: "7.0" | "6.2";
            dataTiering: boolean;
        }> | undefined;
    }[];
}, {
    stacks: {
        caches?: Record<string, {
            type?: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge" | undefined;
            port?: number | undefined;
            shards?: number | undefined;
            replicasPerShard?: number | undefined;
            engine?: "7.0" | "6.2" | undefined;
            dataTiering?: boolean | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        crons: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                vpc: zod.ZodOptional<zod.ZodBoolean>;
                log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                reserved: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            schedule: zod.ZodUnion<[zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, string, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${string} ${string} ${string} ${string} ${string} ${string}`, zod.ZodTypeDef, `${string} ${string} ${string} ${string} ${string} ${string}`>, `${string} ${string} ${string} ${string} ${string} ${string}`, `${string} ${string} ${string} ${string} ${string} ${string}`>, string, `${string} ${string} ${string} ${string} ${string} ${string}`>]>;
            payload: zod.ZodOptional<zod.ZodUnknown>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: string;
            payload?: unknown;
        }, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}` | undefined);
            payload?: unknown;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: string;
            payload?: unknown;
        }> | undefined;
    }, {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}` | undefined);
            payload?: unknown;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: string;
            payload?: unknown;
        }> | undefined;
    }[];
}, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}` | undefined);
            payload?: unknown;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        queue: zod.ZodDefault<zod.ZodObject<{
            retentionPeriod: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            batchSize: zod.ZodDefault<zod.ZodNumber>;
            maxConcurrency: zod.ZodOptional<zod.ZodNumber>;
            maxBatchingWindow: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
        }, "strip", zod.ZodTypeAny, {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            maxMessageSize: Size;
            batchSize: number;
            receiveMessageWaitTime?: Duration | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        }, {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        queue: {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            maxMessageSize: Size;
            batchSize: number;
            receiveMessageWaitTime?: Duration | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        };
    }, {
        queue?: {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        } | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        queues: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                vpc: zod.ZodOptional<zod.ZodBoolean>;
                log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                reserved: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            retentionPeriod: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            batchSize: zod.ZodOptional<zod.ZodNumber>;
            maxConcurrency: zod.ZodOptional<zod.ZodNumber>;
            maxBatchingWindow: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        }, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        }> | undefined;
    }, {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: Duration | undefined;
            visibilityTimeout?: Duration | undefined;
            deliveryDelay?: Duration | undefined;
            receiveMessageWaitTime?: Duration | undefined;
            maxMessageSize?: Size | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        }> | undefined;
    }[];
    defaults: {
        queue: {
            retentionPeriod: Duration;
            visibilityTimeout: Duration;
            deliveryDelay: Duration;
            maxMessageSize: Size;
            batchSize: number;
            receiveMessageWaitTime?: Duration | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: Duration | undefined;
        };
    };
}, {
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        }> | undefined;
    }[];
    defaults?: {
        queue?: {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            batchSize?: number | undefined;
            maxConcurrency?: number | undefined;
            maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        } | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        tables: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            hash: zod.ZodString;
            sort: zod.ZodOptional<zod.ZodString>;
            fields: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodEnum<["string", "number", "binary"]>>>;
            class: zod.ZodDefault<zod.ZodEnum<["standard", "standard-infrequent-access"]>>;
            pointInTimeRecovery: zod.ZodDefault<zod.ZodBoolean>;
            timeToLiveAttribute: zod.ZodOptional<zod.ZodString>;
            stream: zod.ZodOptional<zod.ZodObject<{
                type: zod.ZodEnum<["keys-only", "new-image", "old-image", "new-and-old-images"]>;
                consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                    file: zod.ZodEffects<zod.ZodString, string, string>;
                    vpc: zod.ZodOptional<zod.ZodBoolean>;
                    log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                    timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                    runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                    memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                    ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                    reserved: zod.ZodOptional<zod.ZodNumber>;
                    environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
                }, "strip", zod.ZodTypeAny, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }>]>;
            }, "strip", zod.ZodTypeAny, {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            }, {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            }>>;
            indexes: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
                hash: zod.ZodString;
                sort: zod.ZodOptional<zod.ZodString>;
                projection: zod.ZodDefault<zod.ZodEnum<["all", "keys-only"]>>;
            }, "strip", zod.ZodTypeAny, {
                hash: string;
                projection: "keys-only" | "all";
                sort?: string | undefined;
            }, {
                hash: string;
                sort?: string | undefined;
                projection?: "keys-only" | "all" | undefined;
            }>>>;
        }, "strip", zod.ZodTypeAny, {
            hash: string;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "keys-only" | "all";
                sort?: string | undefined;
            }> | undefined;
        }, {
            hash: string;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "keys-only" | "all" | undefined;
            }> | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        tables?: Record<string, {
            hash: string;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "keys-only" | "all";
                sort?: string | undefined;
            }> | undefined;
        }> | undefined;
    }, {
        tables?: Record<string, {
            hash: string;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "keys-only" | "all" | undefined;
            }> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        tables?: Record<string, {
            hash: string;
            class: "standard" | "standard-infrequent-access";
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: "keys-only" | "all";
                sort?: string | undefined;
            }> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        tables?: Record<string, {
            hash: string;
            sort?: string | undefined;
            fields?: Record<string, "string" | "number" | "binary"> | undefined;
            class?: "standard" | "standard-infrequent-access" | undefined;
            pointInTimeRecovery?: boolean | undefined;
            timeToLiveAttribute?: string | undefined;
            stream?: {
                type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            } | undefined;
            indexes?: Record<string, {
                hash: string;
                sort?: string | undefined;
                projection?: "keys-only" | "all" | undefined;
            }> | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        stores: zod.ZodOptional<zod.ZodArray<zod.ZodEffects<zod.ZodString, string, string>, "many">>;
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
    stacks: zod.ZodEffects<zod.ZodArray<zod.ZodObject<{
        topics: zod.ZodOptional<zod.ZodEffects<zod.ZodArray<zod.ZodEffects<zod.ZodString, string, string>, "many">, string[], string[]>>;
        subscribers: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            vpc: zod.ZodOptional<zod.ZodBoolean>;
            log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">, {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[], {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[]>;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        topics?: string[] | undefined;
        subscribers?: Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        pubsub: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            sql: zod.ZodString;
            sqlVersion: zod.ZodDefault<zod.ZodEnum<["2015-10-08", "2016-03-23", "beta"]>>;
            consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                vpc: zod.ZodOptional<zod.ZodBoolean>;
                log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                reserved: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion: "2015-10-08" | "2016-03-23" | "beta";
        }, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion: "2015-10-08" | "2016-03-23" | "beta";
        }> | undefined;
    }, {
        pubsub?: Record<string, {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
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
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
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
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            sql: string;
            sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        searchs: zod.ZodOptional<zod.ZodArray<zod.ZodEffects<zod.ZodString, string, string>, "many">>;
    }, "strip", zod.ZodTypeAny, {
        searchs?: string[] | undefined;
    }, {
        searchs?: string[] | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        searchs?: string[] | undefined;
    }[];
}, {
    stacks: {
        searchs?: string[] | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        graphql: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            domain: zod.ZodOptional<zod.ZodString>;
            subDomain: zod.ZodOptional<zod.ZodString>;
            authorization: zod.ZodOptional<zod.ZodObject<{
                authorizer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                    file: zod.ZodEffects<zod.ZodString, string, string>;
                    vpc: zod.ZodOptional<zod.ZodBoolean>;
                    log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                    timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                    runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                    memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                    ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                    reserved: zod.ZodOptional<zod.ZodNumber>;
                    environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
                }, "strip", zod.ZodTypeAny, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }>]>;
                ttl: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            }, "strip", zod.ZodTypeAny, {
                ttl: Duration;
                authorizer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
            }, {
                authorizer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
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
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
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
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
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
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
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
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        graphql: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            schema: zod.ZodOptional<zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodArray<zod.ZodEffects<zod.ZodString, string, string>, "many">]>>;
            resolvers: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodRecord<zod.ZodString, zod.ZodUnion<[zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                vpc: zod.ZodOptional<zod.ZodBoolean>;
                log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                reserved: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>, zod.ZodObject<{
                consumer: zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                    file: zod.ZodEffects<zod.ZodString, string, string>;
                    vpc: zod.ZodOptional<zod.ZodBoolean>;
                    log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                    timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                    runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                    memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                    ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                    retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                    reserved: zod.ZodOptional<zod.ZodNumber>;
                    environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
                }, "strip", zod.ZodTypeAny, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }, {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }>]>;
                resolver: zod.ZodEffects<zod.ZodString, string, string>;
            }, "strip", zod.ZodTypeAny, {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }, {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }>]>>>>;
        }, "strip", zod.ZodTypeAny, {
            schema?: string | string[] | undefined;
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }>> | undefined;
        }, {
            schema?: string | string[] | undefined;
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }>> | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }>> | undefined;
        }> | undefined;
    }, {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
            }>> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        graphql?: Record<string, {
            schema?: string | string[] | undefined;
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
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
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | Duration | undefined;
                    timeout?: Duration | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: Size | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: Size | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
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
            resolvers?: Record<string, Record<string, string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | {
                consumer: (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                resolver: string;
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
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                }) & (string | {
                    file: string;
                    vpc?: boolean | undefined;
                    log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                    runtime?: "nodejs18.x" | undefined;
                    memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    architecture?: "x86_64" | "arm64" | undefined;
                    ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                    retryAttempts?: number | undefined;
                    reserved?: number | undefined;
                    environment?: Record<string, string> | undefined;
                } | undefined);
                ttl?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            } | undefined;
            resolver?: string | undefined;
        }> | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        http: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            domain: zod.ZodString;
            subDomain: zod.ZodOptional<zod.ZodString>;
        }, "strip", zod.ZodTypeAny, {
            domain: string;
            subDomain?: string | undefined;
        }, {
            domain: string;
            subDomain?: string | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        http?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    }, {
        http?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        http: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodRecord<zod.ZodType<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, zod.ZodTypeDef, `POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            vpc: zod.ZodOptional<zod.ZodBoolean>;
            log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>>;
    }, "strip", zod.ZodTypeAny, {
        http?: Record<string, Partial<Record<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }, {
        http?: Record<string, Partial<Record<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        http?: Record<string, Partial<Record<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }[];
    defaults: {
        http?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    };
}, {
    stacks: {
        http?: Record<string, Partial<Record<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }[];
    defaults?: {
        http?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        rest: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            domain: zod.ZodString;
            subDomain: zod.ZodOptional<zod.ZodString>;
        }, "strip", zod.ZodTypeAny, {
            domain: string;
            subDomain?: string | undefined;
        }, {
            domain: string;
            subDomain?: string | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        rest?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    }, {
        rest?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        rest: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodRecord<zod.ZodType<RouteFormat, zod.ZodTypeDef, RouteFormat>, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            vpc: zod.ZodOptional<zod.ZodBoolean>;
            log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>>;
    }, "strip", zod.ZodTypeAny, {
        rest?: Record<string, Partial<Record<RouteFormat, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }, {
        rest?: Record<string, Partial<Record<RouteFormat, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        rest?: Record<string, Partial<Record<RouteFormat, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }[];
    defaults: {
        rest?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    };
}, {
    stacks: {
        rest?: Record<string, Partial<Record<RouteFormat, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>> | undefined;
    }[];
    defaults?: {
        rest?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
        }> | undefined;
    } | undefined;
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        sites: zod.ZodOptional<zod.ZodRecord<zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            domain: zod.ZodString;
            subDomain: zod.ZodOptional<zod.ZodString>;
            static: zod.ZodOptional<zod.ZodEffects<zod.ZodString, string, string>>;
            ssr: zod.ZodOptional<zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
                file: zod.ZodEffects<zod.ZodString, string, string>;
                vpc: zod.ZodOptional<zod.ZodBoolean>;
                log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodOptional<zod.ZodNumber>;
                reserved: zod.ZodOptional<zod.ZodNumber>;
                environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
            }, "strip", zod.ZodTypeAny, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }>]>>;
            cors: zod.ZodOptional<zod.ZodObject<{
                override: zod.ZodDefault<zod.ZodBoolean>;
                maxAge: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                exposeHeaders: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
                credentials: zod.ZodDefault<zod.ZodBoolean>;
                headers: zod.ZodDefault<zod.ZodArray<zod.ZodString, "many">>;
                origins: zod.ZodDefault<zod.ZodArray<zod.ZodString, "many">>;
                methods: zod.ZodDefault<zod.ZodArray<zod.ZodEnum<["GET", "DELETE", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "ALL"]>, "many">>;
            }, "strip", zod.ZodTypeAny, {
                override: boolean;
                maxAge: Duration;
                credentials: boolean;
                headers: string[];
                origins: string[];
                methods: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[];
                exposeHeaders?: string[] | undefined;
            }, {
                override?: boolean | undefined;
                maxAge?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                exposeHeaders?: string[] | undefined;
                credentials?: boolean | undefined;
                headers?: string[] | undefined;
                origins?: string[] | undefined;
                methods?: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[] | undefined;
            }>>;
            security: zod.ZodOptional<zod.ZodObject<{}, "strip", zod.ZodTypeAny, {}, {}>>;
            cache: zod.ZodOptional<zod.ZodObject<{
                cookies: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
                headers: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
                queries: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
            }, "strip", zod.ZodTypeAny, {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            }, {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            }>>;
        }, "strip", zod.ZodTypeAny, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override: boolean;
                maxAge: Duration;
                credentials: boolean;
                headers: string[];
                origins: string[];
                methods: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[];
                exposeHeaders?: string[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override?: boolean | undefined;
                maxAge?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                exposeHeaders?: string[] | undefined;
                credentials?: boolean | undefined;
                headers?: string[] | undefined;
                origins?: string[] | undefined;
                methods?: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        sites?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override: boolean;
                maxAge: Duration;
                credentials: boolean;
                headers: string[];
                origins: string[];
                methods: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[];
                exposeHeaders?: string[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }> | undefined;
    }, {
        sites?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override?: boolean | undefined;
                maxAge?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                exposeHeaders?: string[] | undefined;
                credentials?: boolean | undefined;
                headers?: string[] | undefined;
                origins?: string[] | undefined;
                methods?: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        sites?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | Duration | undefined;
                timeout?: Duration | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: Size | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: Size | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override: boolean;
                maxAge: Duration;
                credentials: boolean;
                headers: string[];
                origins: string[];
                methods: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[];
                exposeHeaders?: string[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        sites?: Record<string, {
            domain: string;
            subDomain?: string | undefined;
            static?: string | undefined;
            ssr?: string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined;
            cors?: {
                override?: boolean | undefined;
                maxAge?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                exposeHeaders?: string[] | undefined;
                credentials?: boolean | undefined;
                headers?: string[] | undefined;
                origins?: string[] | undefined;
                methods?: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[] | undefined;
            } | undefined;
            security?: {} | undefined;
            cache?: {
                cookies?: string[] | undefined;
                headers?: string[] | undefined;
                queries?: string[] | undefined;
            } | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        onFailure: zod.ZodOptional<zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            vpc: zod.ZodOptional<zod.ZodBoolean>;
            log: zod.ZodOptional<zod.ZodUnion<[zod.ZodBoolean, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>]>>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEnum<["nodejs18.x"]>>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEnum<["x86_64", "arm64"]>>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodEffects<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>, Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodOptional<zod.ZodNumber>;
            reserved: zod.ZodOptional<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>>;
        }, "strip", zod.ZodTypeAny, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>;
    }, "strip", zod.ZodTypeAny, {
        onFailure?: string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }, {
        onFailure?: string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        onFailure?: string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | Duration | undefined;
            timeout?: Duration | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: Size | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: Size | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }[];
}, {
    stacks: {
        onFailure?: string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }[];
}>>)[];
type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>;

type BaseConfig = AppConfigOutput & {
    account: string;
    credentials: Credentials;
};
type AppConfigFactory<C = AppConfigInput> = (options: ProgramOptions) => C | Promise<C>;

interface ICode {
    toCodeJson: () => {
        Handler: string;
        Code: {
            S3Bucket: string;
            S3Key: string;
            S3ObjectVersion: string;
        } | {
            ZipFile: string;
        };
    };
}

type UrlProps = {
    target: string;
    qualifier?: string;
    invokeMode?: 'buffered' | 'response-stream';
    authType?: 'aws-iam' | 'none';
    cors?: {
        allow?: {
            credentials?: boolean;
            headers?: string[];
            methods?: string[];
            origins?: string[];
        };
        expose?: {
            headers?: string[];
        };
        maxAge?: Duration;
    };
};
declare class Url extends Resource {
    private props;
    constructor(logicalId: string, props: UrlProps);
    get url(): string;
    properties(): {
        Cors: {
            [x: string]: unknown;
        };
        AuthType: string;
        InvokeMode: string;
        TargetFunctionArn: string;
    };
}

type FunctionProps = {
    code: ICode;
    name?: string;
    description?: string;
    runtime?: 'nodejs18.x';
    architecture?: 'arm64' | 'x86_64';
    memorySize?: Size;
    timeout?: Duration;
    ephemeralStorageSize?: Size;
    environment?: Record<string, string>;
    reserved?: number;
    vpc?: {
        securityGroupIds: string[];
        subnetIds: string[];
    };
};
declare class Function$1 extends Resource {
    private _logicalId;
    private props;
    readonly name: string;
    private role;
    private policy;
    private environmentVariables;
    constructor(_logicalId: string, props: FunctionProps);
    enableLogs(retention?: Duration): this;
    addUrl(props?: Omit<UrlProps, 'target'>): Url;
    addPermissions(...permissions: (Permission | Permission[])[]): this;
    addEnvironment(name: string, value: string): this;
    setVpc(vpc: {
        securityGroupIds: string[];
        subnetIds: string[];
    }): this;
    get id(): string;
    get arn(): string;
    get permissions(): {
        actions: string[];
        resources: string[];
    };
    properties(): {
        Environment: {
            Variables: Record<string, string>;
        };
        VpcConfig?: {
            SecurityGroupIds: string[];
            SubnetIds: string[];
        } | undefined;
        EphemeralStorage: {
            Size: number;
        };
        Handler: string;
        Code: {
            S3Bucket: string;
            S3Key: string;
            S3ObjectVersion: string;
        } | {
            ZipFile: string;
        };
        FunctionName: string;
        MemorySize: number;
        Runtime: "nodejs18.x";
        Timeout: number;
        Architectures: ("x86_64" | "arm64")[];
        Role: string;
    };
}

type Binding = (lambda: Function$1) => void;

type ExtendedConfigOutput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? BaseConfig & z.output<S> : BaseConfig);
type ExtendedConfigInput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? AppConfigInput & z.input<S> : AppConfigInput);
type ResourceContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    app: App;
    stack: Stack;
    bootstrap: Stack;
    usEastBootstrap: Stack;
    resource: Resource;
};
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
type TypeGenContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
};
type Plugin<S extends AnyZodObject | undefined = undefined> = {
    name: string;
    schema?: S;
    onApp?: (context: AppContext<S>) => void;
    onStack?: (context: StackContext<S>) => void;
    onResource?: (context: ResourceContext<S>) => void;
    onTypeGen?: (context: TypeGenContext<S>) => string | void;
};
declare const definePlugin: <S extends AnyZodObject | undefined = undefined>(plugin: Plugin<S>) => Plugin<S>;

declare const APP: "app";
declare const STACK: "stack";
declare const getLocalResourceName: <N extends string, S extends string = "stack">(name: N, stack?: S) => `app-${S}-${N}`;
declare const getGlobalResourceName: <N extends string>(name: N) => `app-${N}`;

declare const getFunctionName: <S extends string, N extends string>(stack: S, name: N) => `app-${S}-${N}`;
interface FunctionResources {
}
declare const Function: FunctionResources;

declare const getTableName: <N extends string, S extends string = "stack">(name: N, stack?: S) => `app-${S}-${N}`;
interface TableResources {
}
declare const Table: TableResources;

declare const getTopicName: <N extends string>(name: N) => `app-${N}`;
interface TopicResources {
}
declare const Topic: TopicResources;

declare const getQueueName: <N extends string, S extends string = "stack">(name: N, stack?: S) => `app-${S}-${N}`;
interface QueueResources {
}
declare const Queue: QueueResources;

declare const getCacheProps: (name: string, stack?: string) => {
    readonly host: string;
    readonly port: number;
};
interface CacheResources {
}
declare const Cache: CacheResources;

declare const getStoreName: <N extends string, S extends string = "stack">(name: N, stack?: S) => `app-${S}-${N}`;
interface StoreResources {
}
declare const Store: StoreResources;

declare const getConfigName: (name: string) => string;
interface ConfigResources {
}
declare const Config: ConfigResources;

declare const getSearchName: <N extends string, S extends string = "stack">(name: N, stack?: S) => `app-${S}-${N}`;
interface SearchResources {
}
declare const Search: SearchResources;

type AppConfig = CombinedDefaultPluginsConfigInput;
type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number];
declare const defineStackConfig: (config: StackConfig) => StackConfig$1 | (StackConfig$1 & {
    extend?: ((ctx: StackContext<undefined>) => void) | undefined;
}) | (StackConfig$1 & {
    functions?: Record<string, string | {
        file: string;
        vpc?: boolean | undefined;
        log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        runtime?: "nodejs18.x" | undefined;
        memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        architecture?: "x86_64" | "arm64" | undefined;
        ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        retryAttempts?: number | undefined;
        reserved?: number | undefined;
        environment?: Record<string, string> | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    configs?: string[] | undefined;
}) | (StackConfig$1 & {
    caches?: Record<string, {
        type?: "t4g.small" | "t4g.medium" | "r6g.large" | "r6g.xlarge" | "r6g.2xlarge" | "r6g.4xlarge" | "r6g.8xlarge" | "r6g.12xlarge" | "r6g.16xlarge" | "r6gd.xlarge" | "r6gd.2xlarge" | "r6gd.4xlarge" | "r6gd.8xlarge" | undefined;
        port?: number | undefined;
        shards?: number | undefined;
        replicasPerShard?: number | undefined;
        engine?: "7.0" | "6.2" | undefined;
        dataTiering?: boolean | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    crons?: Record<string, {
        consumer: (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }) & (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined);
        schedule: (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}`) & (`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | `${string} ${string} ${string} ${string} ${string} ${string}` | undefined);
        payload?: unknown;
    }> | undefined;
}) | (StackConfig$1 & {
    queues?: Record<string, string | {
        consumer: (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }) & (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined);
        retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        batchSize?: number | undefined;
        maxConcurrency?: number | undefined;
        maxBatchingWindow?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    tables?: Record<string, {
        hash: string;
        sort?: string | undefined;
        fields?: Record<string, "string" | "number" | "binary"> | undefined;
        class?: "standard" | "standard-infrequent-access" | undefined;
        pointInTimeRecovery?: boolean | undefined;
        timeToLiveAttribute?: string | undefined;
        stream?: {
            type: "keys-only" | "new-image" | "old-image" | "new-and-old-images";
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
        } | undefined;
        indexes?: Record<string, {
            hash: string;
            sort?: string | undefined;
            projection?: "keys-only" | "all" | undefined;
        }> | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    stores?: string[] | undefined;
}) | (StackConfig$1 & {
    topics?: string[] | undefined;
    subscribers?: Record<string, string | {
        file: string;
        vpc?: boolean | undefined;
        log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        runtime?: "nodejs18.x" | undefined;
        memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        architecture?: "x86_64" | "arm64" | undefined;
        ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        retryAttempts?: number | undefined;
        reserved?: number | undefined;
        environment?: Record<string, string> | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    pubsub?: Record<string, {
        consumer: (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        }) & (string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined);
        sql: string;
        sqlVersion?: "2015-10-08" | "2016-03-23" | "beta" | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    searchs?: string[] | undefined;
}) | (StackConfig$1 & {
    graphql?: Record<string, {
        schema?: string | string[] | undefined;
        resolvers?: Record<string, Record<string, string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | {
            consumer: (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                file: string;
                vpc?: boolean | undefined;
                log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "nodejs18.x" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                retryAttempts?: number | undefined;
                reserved?: number | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            resolver: string;
        }>> | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    http?: Record<string, Partial<Record<`POST /${string}` | `GET /${string}` | `PUT /${string}` | `DELETE /${string}` | `HEAD /${string}` | `OPTIONS /${string}`, string | {
        file: string;
        vpc?: boolean | undefined;
        log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        runtime?: "nodejs18.x" | undefined;
        memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        architecture?: "x86_64" | "arm64" | undefined;
        ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        retryAttempts?: number | undefined;
        reserved?: number | undefined;
        environment?: Record<string, string> | undefined;
    }>>> | undefined;
}) | (StackConfig$1 & {
    rest?: Record<string, Partial<Record<RouteFormat, string | {
        file: string;
        vpc?: boolean | undefined;
        log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        runtime?: "nodejs18.x" | undefined;
        memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        architecture?: "x86_64" | "arm64" | undefined;
        ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        retryAttempts?: number | undefined;
        reserved?: number | undefined;
        environment?: Record<string, string> | undefined;
    }>>> | undefined;
}) | (StackConfig$1 & {
    sites?: Record<string, {
        domain: string;
        subDomain?: string | undefined;
        static?: string | undefined;
        ssr?: string | {
            file: string;
            vpc?: boolean | undefined;
            log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "nodejs18.x" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            reserved?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
        cors?: {
            override?: boolean | undefined;
            maxAge?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            exposeHeaders?: string[] | undefined;
            credentials?: boolean | undefined;
            headers?: string[] | undefined;
            origins?: string[] | undefined;
            methods?: ("POST" | "GET" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH" | "ALL")[] | undefined;
        } | undefined;
        security?: {} | undefined;
        cache?: {
            cookies?: string[] | undefined;
            headers?: string[] | undefined;
            queries?: string[] | undefined;
        } | undefined;
    }> | undefined;
}) | (StackConfig$1 & {
    onFailure?: string | {
        file: string;
        vpc?: boolean | undefined;
        log?: boolean | `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
        runtime?: "nodejs18.x" | undefined;
        memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        architecture?: "x86_64" | "arm64" | undefined;
        ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        retryAttempts?: number | undefined;
        reserved?: number | undefined;
        environment?: Record<string, string> | undefined;
    } | undefined;
});
declare const defineAppConfig: (config: AppConfig | AppConfigFactory<AppConfig>) => CombinedDefaultPluginsConfigInput | AppConfigFactory<CombinedDefaultPluginsConfigInput>;

export { APP, AppConfig, Cache, CacheResources, Config, ConfigResources, Function, FunctionResources, Plugin, Queue, QueueResources, STACK, Search, SearchResources, StackConfig, Store, StoreResources, Table, TableResources, Topic, TopicResources, defineAppConfig, definePlugin, defineStackConfig, getCacheProps, getConfigName, getFunctionName, getGlobalResourceName, getLocalResourceName, getQueueName, getSearchName, getStoreName, getTableName, getTopicName };
