import * as aws_cdk_lib_aws_dynamodb_index_js from 'aws-cdk-lib/aws-dynamodb/index.js';
import * as aws_cdk_lib_aws_events_index_js from 'aws-cdk-lib/aws-events/index.js';
import * as aws_cdk_lib from 'aws-cdk-lib';
import { Stack, App } from 'aws-cdk-lib';
import * as zod from 'zod';
import { z, AnyZodObject } from 'zod';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { Function } from 'aws-cdk-lib/aws-lambda';
import * as aws_cdk_lib_aws_lambda_index_js from 'aws-cdk-lib/aws-lambda/index.js';

type StackConfig$1 = {
    name: string;
    depends?: Array<StackConfig$1>;
};

type AssetDetails = Record<string, string>;
type AssetOptions = {
    id: number;
    stack: StackConfig$1;
    resource: string;
    resourceName: string;
    build?: () => Promise<AssetDetails | void> | AssetDetails | void;
    publish?: () => Promise<AssetDetails | void> | AssetDetails | void;
};
declare class Assets {
    private assets;
    private id;
    add(opts: Omit<AssetOptions, 'id'>): void;
    list(): Record<string, (AssetOptions & {
        id: number;
    })[]>;
    forEach(cb: (stack: StackConfig$1, assets: AssetOptions[]) => void): void;
    map(cb: (stack: StackConfig$1, assets: AssetOptions[]) => Promise<void>): Promise<void>[];
}

type Credentials = AwsCredentialIdentityProvider;

declare const AppSchema: z.ZodObject<{
    name: z.ZodString;
    region: z.ZodEnum<["us-east-2", "us-east-1", "us-west-1", "us-west-2", "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3", "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1", "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"]>;
    profile: z.ZodString;
    stage: z.ZodDefault<z.ZodString>;
    defaults: z.ZodDefault<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    stacks: z.ZodArray<z.ZodType<StackConfig$1, z.ZodTypeDef, StackConfig$1>, "many">;
    plugins: z.ZodOptional<z.ZodArray<z.ZodType<Plugin<z.AnyZodObject | undefined>, z.ZodTypeDef, Plugin<z.AnyZodObject | undefined>>, "many">>;
}, "strip", z.ZodTypeAny, {
    defaults: {};
    stacks: StackConfig$1[];
    name: string;
    region: "us-east-2" | "us-east-1" | "us-west-1" | "us-west-2" | "af-south-1" | "ap-east-1" | "ap-south-2" | "ap-southeast-3" | "ap-southeast-4" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-northeast-1" | "ca-central-1" | "eu-central-1" | "eu-west-1" | "eu-west-2" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-north-1" | "eu-central-2" | "me-south-1" | "me-central-1" | "sa-east-1";
    profile: string;
    stage: string;
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

type BaseConfig = AppConfigOutput & {
    account: string;
    credentials: Credentials;
};

type Binding = (lambda: Function) => void;

type ExtendedConfigOutput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? BaseConfig & z.output<S> : BaseConfig);
type ExtendedConfigInput<S extends AnyZodObject | undefined = undefined> = (S extends AnyZodObject ? AppConfigInput & z.input<S> : AppConfigInput);
type StackContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    stack: Stack;
    stackConfig: ExtendedConfigOutput<S>['stacks'][number];
    assets: Assets;
    app: App;
    bind: (cb: Binding) => void;
};
type BootstrapContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    assets: Assets;
    stack: Stack;
    app: App;
};
type AppContext<S extends AnyZodObject | undefined = undefined> = {
    config: ExtendedConfigOutput<S>;
    assets: Assets;
    app: App;
};
type Plugin<S extends AnyZodObject | undefined = undefined> = {
    name: string;
    schema?: S;
    onBootstrap?: (config: BootstrapContext<S>) => void;
    onStack?: (context: StackContext<S>) => Function[] | void;
    onApp?: (config: AppContext<S>) => void;
};
declare const definePlugin: <S extends AnyZodObject | undefined = undefined>(plugin: Plugin<S>) => Plugin<S>;

declare const defaultPlugins: (Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        function: zod.ZodDefault<zod.ZodObject<{
            timeout: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodDefault<zod.ZodEffects<zod.ZodEnum<["container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go"]>, aws_cdk_lib_aws_lambda_index_js.Runtime, "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go">>;
            memorySize: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodDefault<zod.ZodEffects<zod.ZodEnum<["x86_64", "arm_64"]>, aws_cdk_lib_aws_lambda_index_js.Architecture, "x86_64" | "arm_64">>;
            ephemeralStorageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodDefault<zod.ZodNumber>;
            environment: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>;
        }, "strip", zod.ZodTypeAny, {
            timeout: aws_cdk_lib.Duration;
            runtime: aws_cdk_lib_aws_lambda_index_js.Runtime;
            memorySize: aws_cdk_lib.Size;
            architecture: aws_cdk_lib_aws_lambda_index_js.Architecture;
            ephemeralStorageSize: aws_cdk_lib.Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        }, {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        function: {
            timeout: aws_cdk_lib.Duration;
            runtime: aws_cdk_lib_aws_lambda_index_js.Runtime;
            memorySize: aws_cdk_lib.Size;
            architecture: aws_cdk_lib_aws_lambda_index_js.Architecture;
            ephemeralStorageSize: aws_cdk_lib.Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        };
    }, {
        function?: {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            retryAttempts?: number | undefined;
            environment?: Record<string, string> | undefined;
        } | undefined;
    }>>;
    stacks: zod.ZodArray<zod.ZodObject<{
        functions: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodUnion<[zod.ZodEffects<zod.ZodString, string, string>, zod.ZodObject<{
            file: zod.ZodEffects<zod.ZodString, string, string>;
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go"]>, aws_cdk_lib_aws_lambda_index_js.Runtime, "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go">>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["x86_64", "arm_64"]>, aws_cdk_lib_aws_lambda_index_js.Architecture, "x86_64" | "arm_64">>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodNumber;
            environment: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>;
        }, "strip", zod.ZodTypeAny, {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        functions?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        functions?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    defaults: {
        function: {
            timeout: aws_cdk_lib.Duration;
            runtime: aws_cdk_lib_aws_lambda_index_js.Runtime;
            memorySize: aws_cdk_lib.Size;
            architecture: aws_cdk_lib_aws_lambda_index_js.Architecture;
            ephemeralStorageSize: aws_cdk_lib.Size;
            retryAttempts: number;
            environment?: Record<string, string> | undefined;
        };
    };
    stacks: {
        functions?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        functions?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
    defaults?: {
        function?: {
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
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
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go"]>, aws_cdk_lib_aws_lambda_index_js.Runtime, "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go">>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["x86_64", "arm_64"]>, aws_cdk_lib_aws_lambda_index_js.Architecture, "x86_64" | "arm_64">>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodNumber;
                environment: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>;
            }, "strip", zod.ZodTypeAny, {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            schedule: zod.ZodUnion<[zod.ZodEffects<zod.ZodType<`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)`, zod.ZodTypeDef, `rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)`>, aws_cdk_lib_aws_events_index_js.Schedule, `rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)`>, zod.ZodEffects<zod.ZodEffects<zod.ZodType<`cron(${string} ${string} ${string} ${string} ${string} ${string})`, zod.ZodTypeDef, `cron(${string} ${string} ${string} ${string} ${string} ${string})`>, `cron(${string} ${string} ${string} ${string} ${string} ${string})`, `cron(${string} ${string} ${string} ${string} ${string} ${string})`>, aws_cdk_lib_aws_events_index_js.Schedule, `cron(${string} ${string} ${string} ${string} ${string} ${string})`>]>;
            description: zod.ZodOptional<zod.ZodString>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: aws_cdk_lib_aws_events_index_js.Schedule;
            description?: string | undefined;
        }, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            description?: string | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        crons?: Record<string, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: aws_cdk_lib_aws_events_index_js.Schedule;
            description?: string | undefined;
        }> | undefined;
    }, {
        crons?: Record<string, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            description?: string | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: aws_cdk_lib_aws_events_index_js.Schedule;
            description?: string | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        crons?: Record<string, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            schedule: (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})`) & (`rate(${number} second)` | `rate(${number} seconds)` | `rate(${number} minute)` | `rate(${number} minutes)` | `rate(${number} hour)` | `rate(${number} hours)` | `rate(${number} day)` | `rate(${number} days)` | `cron(${string} ${string} ${string} ${string} ${string} ${string})` | undefined);
            description?: string | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    defaults: zod.ZodDefault<zod.ZodObject<{
        queue: zod.ZodDefault<zod.ZodObject<{
            retentionPeriod: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodDefault<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
        }, "strip", zod.ZodTypeAny, {
            retentionPeriod: aws_cdk_lib.Duration;
            visibilityTimeout: aws_cdk_lib.Duration;
            deliveryDelay: aws_cdk_lib.Duration;
            receiveMessageWaitTime: aws_cdk_lib.Duration;
            maxMessageSize: aws_cdk_lib.Size;
        }, {
            retentionPeriod?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            visibilityTimeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            deliveryDelay?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            receiveMessageWaitTime?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            maxMessageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
        }>>;
    }, "strip", zod.ZodTypeAny, {
        queue: {
            retentionPeriod: aws_cdk_lib.Duration;
            visibilityTimeout: aws_cdk_lib.Duration;
            deliveryDelay: aws_cdk_lib.Duration;
            receiveMessageWaitTime: aws_cdk_lib.Duration;
            maxMessageSize: aws_cdk_lib.Size;
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
                timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
                runtime: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go"]>, aws_cdk_lib_aws_lambda_index_js.Runtime, "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go">>;
                memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                architecture: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["x86_64", "arm_64"]>, aws_cdk_lib_aws_lambda_index_js.Architecture, "x86_64" | "arm_64">>;
                ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
                retryAttempts: zod.ZodNumber;
                environment: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>;
            }, "strip", zod.ZodTypeAny, {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }, {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }>]>;
            retentionPeriod: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            visibilityTimeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            deliveryDelay: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            receiveMessageWaitTime: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            maxMessageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
        }, "strip", zod.ZodTypeAny, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: aws_cdk_lib.Duration | undefined;
            visibilityTimeout?: aws_cdk_lib.Duration | undefined;
            deliveryDelay?: aws_cdk_lib.Duration | undefined;
            receiveMessageWaitTime?: aws_cdk_lib.Duration | undefined;
            maxMessageSize?: aws_cdk_lib.Size | undefined;
        }, {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
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
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: aws_cdk_lib.Duration | undefined;
            visibilityTimeout?: aws_cdk_lib.Duration | undefined;
            deliveryDelay?: aws_cdk_lib.Duration | undefined;
            receiveMessageWaitTime?: aws_cdk_lib.Duration | undefined;
            maxMessageSize?: aws_cdk_lib.Size | undefined;
        }> | undefined;
    }, {
        queues?: Record<string, string | {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
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
    defaults: {
        queue: {
            retentionPeriod: aws_cdk_lib.Duration;
            visibilityTimeout: aws_cdk_lib.Duration;
            deliveryDelay: aws_cdk_lib.Duration;
            receiveMessageWaitTime: aws_cdk_lib.Duration;
            maxMessageSize: aws_cdk_lib.Size;
        };
    };
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: aws_cdk_lib.Duration | undefined;
                runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
                memorySize?: aws_cdk_lib.Size | undefined;
                architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
                ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
                environment?: Record<string, string> | undefined;
            } | undefined);
            retentionPeriod?: aws_cdk_lib.Duration | undefined;
            visibilityTimeout?: aws_cdk_lib.Duration | undefined;
            deliveryDelay?: aws_cdk_lib.Duration | undefined;
            receiveMessageWaitTime?: aws_cdk_lib.Duration | undefined;
            maxMessageSize?: aws_cdk_lib.Size | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        queues?: Record<string, string | {
            consumer: (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                environment?: Record<string, string> | undefined;
            }) & (string | {
                retryAttempts: number;
                file: string;
                timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
                runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
                memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
                architecture?: "x86_64" | "arm_64" | undefined;
                ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
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
            fields: zod.ZodRecord<zod.ZodString, zod.ZodEffects<zod.ZodEnum<["string" | "number" | "binary"]>, aws_cdk_lib_aws_dynamodb_index_js.AttributeType, "string" | "number" | "binary">>;
            class: zod.ZodDefault<zod.ZodEffects<zod.ZodEnum<["standard" | "standard-infrequent-access"]>, aws_cdk_lib_aws_dynamodb_index_js.TableClass, "standard" | "standard-infrequent-access">>;
            pointInTimeRecovery: zod.ZodDefault<zod.ZodBoolean>;
            timeToLiveAttribute: zod.ZodOptional<zod.ZodString>;
            indexes: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodObject<{
                hash: zod.ZodString;
                sort: zod.ZodOptional<zod.ZodString>;
                projection: zod.ZodDefault<zod.ZodUnion<[zod.ZodEffects<zod.ZodEnum<["all" | "keys-only"]>, {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                }, "all" | "keys-only">, zod.ZodEffects<zod.ZodArray<zod.ZodString, "many">, {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }, string[]>]>>;
            }, "strip", zod.ZodTypeAny, {
                hash: string;
                projection: ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }) & ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                } | undefined);
                sort?: string | undefined;
            }, {
                hash: string;
                sort?: string | undefined;
                projection?: string[] | "all" | "keys-only" | undefined;
            }>>>;
        }, "strip", zod.ZodTypeAny, {
            hash: string;
            fields: Record<string, aws_cdk_lib_aws_dynamodb_index_js.AttributeType>;
            class: aws_cdk_lib_aws_dynamodb_index_js.TableClass;
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }) & ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                } | undefined);
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
                projection?: string[] | "all" | "keys-only" | undefined;
            }> | undefined;
        }>, {
            hash: string;
            fields: Record<string, aws_cdk_lib_aws_dynamodb_index_js.AttributeType>;
            class: aws_cdk_lib_aws_dynamodb_index_js.TableClass;
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }) & ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                } | undefined);
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
                projection?: string[] | "all" | "keys-only" | undefined;
            }> | undefined;
        }>>>;
    }, "strip", zod.ZodTypeAny, {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, aws_cdk_lib_aws_dynamodb_index_js.AttributeType>;
            class: aws_cdk_lib_aws_dynamodb_index_js.TableClass;
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }) & ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                } | undefined);
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
                projection?: string[] | "all" | "keys-only" | undefined;
            }> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        tables?: Record<string, {
            hash: string;
            fields: Record<string, aws_cdk_lib_aws_dynamodb_index_js.AttributeType>;
            class: aws_cdk_lib_aws_dynamodb_index_js.TableClass;
            pointInTimeRecovery: boolean;
            sort?: string | undefined;
            timeToLiveAttribute?: string | undefined;
            indexes?: Record<string, {
                hash: string;
                projection: ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                }) & ({
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                } | {
                    ProjectionType: aws_cdk_lib_aws_dynamodb_index_js.ProjectionType;
                    NonKeyAttributes: string[];
                } | undefined);
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
                projection?: string[] | "all" | "keys-only" | undefined;
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
            timeout: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`, zod.ZodTypeDef, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>, aws_cdk_lib.Duration, `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days`>>;
            runtime: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go"]>, aws_cdk_lib_aws_lambda_index_js.Runtime, "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go">>;
            memorySize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            architecture: zod.ZodOptional<zod.ZodEffects<zod.ZodEnum<["x86_64", "arm_64"]>, aws_cdk_lib_aws_lambda_index_js.Architecture, "x86_64" | "arm_64">>;
            ephemeralStorageSize: zod.ZodOptional<zod.ZodEffects<zod.ZodType<`${number} KB` | `${number} MB` | `${number} GB`, zod.ZodTypeDef, `${number} KB` | `${number} MB` | `${number} GB`>, aws_cdk_lib.Size, `${number} KB` | `${number} MB` | `${number} GB`>>;
            retryAttempts: zod.ZodNumber;
            environment: zod.ZodOptional<zod.ZodRecord<zod.ZodString, zod.ZodString>>;
        }, "strip", zod.ZodTypeAny, {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }, {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }>]>>>;
    }, "strip", zod.ZodTypeAny, {
        topics?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }, {
        topics?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }>, "many">;
}, "strip", zod.ZodTypeAny, {
    stacks: {
        topics?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: aws_cdk_lib.Duration | undefined;
            runtime?: aws_cdk_lib_aws_lambda_index_js.Runtime | undefined;
            memorySize?: aws_cdk_lib.Size | undefined;
            architecture?: aws_cdk_lib_aws_lambda_index_js.Architecture | undefined;
            ephemeralStorageSize?: aws_cdk_lib.Size | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}, {
    stacks: {
        topics?: Record<string, string | {
            retryAttempts: number;
            file: string;
            timeout?: `${number} second` | `${number} seconds` | `${number} minute` | `${number} minutes` | `${number} hour` | `${number} hours` | `${number} day` | `${number} days` | undefined;
            runtime?: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "python3.9" | "python3.10" | "go1.x" | "go" | undefined;
            memorySize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            architecture?: "x86_64" | "arm_64" | undefined;
            ephemeralStorageSize?: `${number} KB` | `${number} MB` | `${number} GB` | undefined;
            environment?: Record<string, string> | undefined;
        }> | undefined;
    }[];
}>> | Plugin<zod.ZodObject<{
    stacks: zod.ZodArray<zod.ZodObject<{
        searchs: zod.ZodOptional<zod.ZodArray<zod.ZodString, "many">>;
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
}>>)[];
type CombinedDefaultPluginsConfigInput = ExtendedConfigInput<typeof defaultPlugins[number]['schema']>;

type AppConfig = CombinedDefaultPluginsConfigInput;
type StackConfig = CombinedDefaultPluginsConfigInput['stacks'][number];

export { AppConfig, Plugin, StackConfig, definePlugin };
