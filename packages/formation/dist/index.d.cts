import TypedEmitter from 'typed-emitter';
import * as _aws_sdk_client_acm from '@aws-sdk/client-acm';
import { ACMClient } from '@aws-sdk/client-acm';
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { Duration } from '@awsless/duration';
import * as _aws_sdk_client_appsync from '@aws-sdk/client-appsync';
import { AppSyncClient } from '@aws-sdk/client-appsync';
import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { Size } from '@awsless/size';
import * as _aws_sdk_client_route_53 from '@aws-sdk/client-route-53';
import { Route53Client } from '@aws-sdk/client-route-53';
import * as _aws_sdk_client_s3 from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';

type ExportedData = Record<string, Record<string, unknown>>;

type ResolvedAsset = {
    hash: string;
    data: Buffer;
};
declare abstract class Asset {
    static fromJSON(json: unknown): StringAsset;
    static fromString(string: string, encoding?: BufferEncoding): StringAsset;
    static fromFile(path: string): FileAsset;
    static fromRemote(url: URL): RemoteAsset;
    abstract load(): Promise<Buffer> | Buffer;
}
declare class StringAsset extends Asset {
    readonly value: string;
    readonly encoding: BufferEncoding;
    constructor(value: string, encoding?: BufferEncoding);
    load(): Promise<Buffer>;
}
declare class FileAsset extends Asset {
    readonly path: string;
    constructor(path: string);
    load(): Promise<Buffer>;
}
declare class RemoteAsset extends Asset {
    readonly url: URL;
    constructor(url: URL);
    load(): Promise<Buffer>;
}

type ResourceDocument = Record<string, unknown>;
type ResourceExtra = Record<string, unknown>;
type CreateProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    type: string;
    document: D;
    extra: E;
    assets: Record<string, ResolvedAsset>;
};
type UpdateProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    id: string;
    type: string;
    oldDocument: D;
    newDocument: D;
    remoteDocument: any;
    extra: E;
    assets: Record<string, ResolvedAsset>;
};
type DeleteProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    id: string;
    type: string;
    document: D;
    extra: E;
    assets: Record<string, string>;
};
type GetProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    id: string;
    type: string;
    document: D;
    extra: E;
};
interface CloudProvider {
    own(id: string): boolean;
    get(props: GetProps): Promise<any>;
    create(props: CreateProps): Promise<string>;
    update(props: UpdateProps): Promise<string>;
    delete(props: DeleteProps): Promise<void>;
}

type Input<T> = T | Output<T>;
declare class Output<T> {
    readonly resources: Resource[];
    protected listeners: Set<(value: T) => unknown>;
    protected value: T | undefined;
    protected resolved: boolean;
    constructor(resources: Resource[], cb: (resolve: (data: T) => void) => void);
    apply<N>(cb: (value: T) => N): Output<N>;
    valueOf(): T | undefined;
}
declare const findResources: (props: unknown) => Resource[];
declare const all: <I extends [any, ...any[]]>(inputs: I) => Output<UnwrapArray<I>>;
type UnwrapArray<T extends Input<unknown>[]> = {
    [K in keyof T]: Unwrap<T[K]>;
};
type Unwrap<T> = T extends Output<infer V> ? V : T;
declare function unwrap<T extends Input<unknown>>(input: T): Unwrap<T>;
declare function unwrap<T extends Input<unknown>>(input: T, defaultValue: Unwrap<T>): Exclude<Unwrap<T>, undefined>;

type URN = `urn:${string}`;
type ResourceDeletionPolicy = 'retain' | 'before-deployment' | 'after-deployment';
type ResourcePolicies = {
    deletionPolicy?: ResourceDeletionPolicy;
};
declare abstract class Resource extends Node {
    readonly type: string;
    readonly identifier: string;
    private remoteDocument;
    private listeners;
    readonly dependencies: Set<Resource>;
    constructor(type: string, identifier: string, inputs?: unknown);
    abstract cloudProviderId: string;
    deletionPolicy: ResourceDeletionPolicy;
    abstract toState(): {
        extra?: Record<string, unknown>;
        assets?: Record<string, Input<Asset>>;
        document?: ResourceDocument;
    };
    dependsOn(...resources: Resource[]): this;
    protected registerDependency(props: unknown): void;
    setRemoteDocument(remoteDocument: any): void;
    output<T = string>(getter: (remoteDocument: any) => T): Output<T>;
    protected attr<T>(name: string, input: Input<T>, transform?: (value: T | Unwrap<T>) => unknown): {
        [x: string]: unknown;
    };
}

declare class Node {
    readonly type: string;
    readonly identifier: string;
    private childs;
    private parental;
    constructor(type: string, identifier: string);
    get urn(): URN;
    get parent(): Node | undefined;
    get children(): Set<Node>;
    add(...nodes: Node[]): void;
}
declare const flatten: (node: Node) => Node[];

declare class Stack extends Node {
    readonly name: string;
    readonly exported: Record<string, Input<unknown>>;
    readonly dependencies: Set<Stack>;
    constructor(name: string);
    get resources(): Resource[];
    export(key: string, value: Input<unknown>): this;
    import<T>(key: string): Input<T>;
}

declare class App extends Node {
    readonly name: string;
    private exported?;
    private listeners;
    constructor(name: string);
    get stacks(): Set<Stack>;
    add(stack: Stack): void;
    import<T>(stack: string, key: string): Output<T>;
    setExportedData(data: ExportedData): void;
}

interface StateProvider$1 {
    lock(urn: URN): Promise<() => Promise<void>>;
    get(urn: URN): Promise<AppState>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}
type AppState = Record<URN, StackState>;
type StackState = {
    name: string;
    exports: Record<URN, unknown>;
    resources: Record<URN, ResourceState>;
};
type ResourceState = {
    id: string;
    type: string;
    provider: string;
    local: ResourceDocument;
    remote?: ResourceDocument;
    assets: Record<string, string>;
    dependencies: URN[];
    extra: Record<string, unknown>;
    policies: {
        deletion: ResourceDeletionPolicy;
    };
};

type ResourceOperation = 'create' | 'update' | 'delete' | 'heal' | 'get';
type StackOperation = 'deploy' | 'delete';
type ResourceEvent = {
    urn: URN;
    type: string;
    operation: ResourceOperation;
    status: 'success' | 'in-progress' | 'error';
    reason?: ResourceError;
};
type StackEvent = {
    urn: URN;
    operation: StackOperation;
    status: 'success' | 'in-progress' | 'error';
    stack: Stack;
    reason?: StackError | Error | unknown;
};
type Events = {
    stack: (event: StackEvent) => void;
    resource: (event: ResourceEvent) => void;
};
declare const WorkSpace_base: new () => TypedEmitter<Events>;
declare class WorkSpace extends WorkSpace_base {
    protected props: {
        cloudProviders: CloudProvider[];
        stateProvider: StateProvider$1;
    };
    constructor(props: {
        cloudProviders: CloudProvider[];
        stateProvider: StateProvider$1;
    });
    protected getCloudProvider(providerId: string, urn: URN): CloudProvider;
    protected unwrapDocument(urn: URN, document: ResourceDocument, safe?: boolean): ResourceDocument;
    protected lockedOperation<T>(urn: URN, fn: () => T): Promise<Awaited<T>>;
    protected resolveAssets(assets: Record<string, Input<Asset>>): Promise<readonly [Record<string, ResolvedAsset>, Record<string, string>]>;
    protected copy<T>(document: T, replacer?: any): T;
    protected compare<T>(left: T, right: T): boolean;
    protected resolveDocumentAssets(document: any, assets: Record<string, ResolvedAsset>): ResourceDocument;
    private getExportedData;
    diffStack(stack: Stack): Promise<{
        creates: `urn:${string}`[];
        updates: `urn:${string}`[];
        deletes: `urn:${string}`[];
    }>;
    deployStack(stack: Stack): Promise<StackState>;
    deleteStack(stack: Stack): Promise<void>;
    private getRemoteResource;
    private deployStackResources;
    private dependentsOn;
    private deleteStackResources;
    private healFromUnknownRemoteState;
}

declare class ResourceError extends Error {
    readonly urn: URN;
    readonly type: string;
    readonly operation: ResourceOperation;
    static wrap(urn: URN, type: string, operation: ResourceOperation, error: unknown): ResourceError;
    constructor(urn: URN, type: string, operation: ResourceOperation, message: string);
}
declare class StackError extends Error {
    readonly issues: ResourceError[];
    constructor(issues: ResourceError[], message: string);
}
declare class ResourceNotFound extends Error {
}
declare class ResourceAlreadyExists extends Error {
}
declare class ImportValueNotFound extends Error {
    constructor(stack: string, key: string);
}

type RecordType = 'A' | 'AAAA' | 'CAA' | 'CNAME' | 'DS' | 'MX' | 'NAPTR' | 'NS' | 'PTR' | 'SOA' | 'SPF' | 'SRV' | 'TXT';
type Record$1 = {
    type: Input<RecordType>;
    name: Input<string>;
    weight?: Input<number>;
} & ({
    ttl?: Input<Duration>;
    records?: Input<Input<string>[]>;
} | {
    alias?: Input<{
        dnsName: Input<string>;
        hostedZoneId: Input<string>;
        evaluateTargetHealth: Input<boolean>;
    }>;
});
type RecordSetProps = {
    hostedZoneId: Input<string>;
} & Record$1;
declare const formatRecordSet: (record: Record$1) => {
    AliasTarget?: {
        DNSName: Input<string>;
        HostedZoneId: Input<string>;
        EvaluateTargetHealth: Input<boolean>;
    } | undefined;
    TTL?: bigint | undefined;
    ResourceRecords?: Input<Input<string>[]> | undefined;
    Name: string;
    Type: Input<RecordType>;
    Weight: number;
};
declare class RecordSet extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: Input<RecordSetProps>);
    toState(): {
        document: {
            AliasTarget?: {
                DNSName: Input<string>;
                HostedZoneId: Input<string>;
                EvaluateTargetHealth: Input<boolean>;
            } | undefined;
            TTL?: bigint | undefined;
            ResourceRecords?: Input<Input<string>[]> | undefined;
            Name: string;
            Type: Input<RecordType>;
            Weight: number;
            HostedZoneId: Input<string>;
        };
    };
}

type KeyAlgorithm = 'RSA_1024' | 'RSA_2048' | 'RSA_3072' | 'RSA_4096' | 'EC_prime256v1' | 'EC_secp384r1' | 'EC_secp521r1';
type CertificateProps = {
    domainName: Input<string>;
    alternativeNames?: Input<Input<string>[]>;
    region?: Input<string>;
    keyAlgorithm?: Input<KeyAlgorithm>;
    validationMethod?: Input<'dns' | 'email'>;
    validationOptions?: Input<Input<{
        domainName: Input<string>;
        validationDomain: Input<string>;
    }>[]>;
};
declare class Certificate extends Resource {
    private props;
    cloudProviderId: string;
    private validation;
    constructor(id: string, props: CertificateProps);
    get arn(): Output<`arn:${string}`>;
    get issuer(): Output<string>;
    validationRecord(index: number): Output<Record$1>;
    get validationRecords(): Output<Record$1[]>;
    get issuedArn(): Output<`arn:${string}`>;
    toState(): {
        extra: {
            region: Input<string> | undefined;
        };
        document: {
            DomainValidationOptions?: {
                DomainName: Input<string>;
                ValidationDomain: Input<string>;
            }[] | undefined;
            ValidationMethod: string;
            KeyAlgorithm: KeyAlgorithm;
            SubjectAlternativeNames?: Input<string>[] | undefined;
            DomainName: Input<string>;
        };
    };
}

type ProviderProps$c = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Extra = {
    region?: string;
};
type Document$9 = {
    DomainName: string;
    SubjectAlternativeNames: string[];
    DomainValidationOptions: {
        DomainName: string;
        ValidationDomain: string;
    }[];
    ValidationMethod: 'DNS' | 'EMAIL';
    KeyAlgorithm: KeyAlgorithm;
};
declare class CertificateProvider implements CloudProvider {
    private props;
    protected clients: Record<string, ACMClient>;
    constructor(props: ProviderProps$c);
    own(id: string): boolean;
    private wait;
    private client;
    get({ id, extra }: GetProps<Document$9, Extra>): Promise<_aws_sdk_client_acm.CertificateDetail>;
    create({ urn, document, extra }: CreateProps<Document$9, Extra>): Promise<string>;
    update(): Promise<string>;
    delete({ id, extra }: DeleteProps<Document$9, Extra>): Promise<void>;
}

type ProviderProps$b = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$8 = {
    Region: string;
    CertificateArn: string;
};
declare class CertificateValidationProvider implements CloudProvider {
    private props;
    protected clients: Record<string, ACMClient>;
    constructor(props: ProviderProps$b);
    own(id: string): boolean;
    private client;
    private wait;
    get({ id, document }: GetProps<Document$8>): Promise<_aws_sdk_client_acm.CertificateDetail>;
    create({ document }: CreateProps<Document$8>): Promise<string>;
    update({ newDocument }: UpdateProps<Document$8>): Promise<string>;
    delete(): Promise<void>;
}

type ARN = `arn:${string}`;

type CertificateValidationProps = {
    certificateArn: Input<ARN>;
    region?: Input<string>;
};
declare class CertificateValidation extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: CertificateValidationProps);
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            Region: Input<string> | undefined;
            CertificateArn: Input<`arn:${string}`>;
        };
    };
}

type index$l_Certificate = Certificate;
declare const index$l_Certificate: typeof Certificate;
type index$l_CertificateProps = CertificateProps;
type index$l_CertificateProvider = CertificateProvider;
declare const index$l_CertificateProvider: typeof CertificateProvider;
type index$l_CertificateValidation = CertificateValidation;
declare const index$l_CertificateValidation: typeof CertificateValidation;
type index$l_CertificateValidationProps = CertificateValidationProps;
type index$l_CertificateValidationProvider = CertificateValidationProvider;
declare const index$l_CertificateValidationProvider: typeof CertificateValidationProvider;
type index$l_KeyAlgorithm = KeyAlgorithm;
declare namespace index$l {
  export {
    index$l_Certificate as Certificate,
    index$l_CertificateProps as CertificateProps,
    index$l_CertificateProvider as CertificateProvider,
    index$l_CertificateValidation as CertificateValidation,
    index$l_CertificateValidationProps as CertificateValidationProps,
    index$l_CertificateValidationProvider as CertificateValidationProvider,
    index$l_KeyAlgorithm as KeyAlgorithm,
  };
}

type ProviderProps$a = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$7 = any;
declare class DataSourceProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$a);
    own(id: string): boolean;
    get({ document }: GetProps<Document$7>): Promise<_aws_sdk_client_appsync.DataSource>;
    create({ document }: CreateProps<Document$7>): Promise<string>;
    update({ id, oldDocument, newDocument }: UpdateProps<Document$7>): Promise<string>;
    delete({ document }: DeleteProps<Document$7>): Promise<void>;
}

type DataSourceProps = {
    apiId: Input<string>;
    name: Input<string>;
    description?: Input<string>;
} & ({
    type: 'none';
} | {
    type: 'lambda';
    role: Input<ARN>;
    functionArn: Input<ARN>;
});
declare class DataSource extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: DataSourceProps);
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    toState(): {
        document: {
            type?: string | undefined;
            serviceRoleArn?: Input<`arn:${string}`> | undefined;
            lambdaConfig?: {
                lambdaFunctionArn: Input<`arn:${string}`>;
            } | undefined;
            apiId: Input<string>;
            name: Input<string>;
        };
    };
}

declare abstract class CloudControlApiResource extends Resource {
    readonly cloudProviderId = "aws-cloud-control-api";
}

declare class DomainNameApiAssociation extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        apiId: Input<string>;
        domainName: Input<string>;
    });
    toState(): {
        document: {
            ApiId: Input<string>;
            DomainName: Input<string>;
        };
    };
}

declare class DomainName extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        domainName: Input<string>;
        certificateArn: Input<ARN>;
    });
    get appSyncDomainName(): Output<string>;
    get domainName(): Output<string>;
    get hostedZoneId(): Output<string>;
    toState(): {
        document: {
            DomainName: Input<string>;
            CertificateArn: Input<`arn:${string}`>;
        };
    };
}

type FunctionConfigurationProps = {
    apiId: Input<string>;
    name: Input<string>;
    code: Input<Asset>;
    dataSourceName: Input<string>;
};
declare class FunctionConfiguration extends CloudControlApiResource {
    private props;
    constructor(id: string, props: FunctionConfigurationProps);
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    toState(): {
        assets: {
            code: Input<Asset>;
        };
        document: {
            ApiId: Input<string>;
            DataSourceName: Input<string>;
            Name: Input<string>;
            Code: {
                __ASSET__: string;
            };
            Runtime: {
                Name: string;
                RuntimeVersion: string;
            };
        };
    };
}

type ProviderProps$9 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$6 = any;
declare class GraphQLApiProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$9);
    own(id: string): boolean;
    get({ id }: GetProps<Document$6>): Promise<_aws_sdk_client_appsync.GraphqlApi>;
    create({ document }: CreateProps<Document$6>): Promise<string>;
    update({ id, newDocument }: UpdateProps<Document$6>): Promise<string>;
    delete({ id }: DeleteProps<Document$6>): Promise<void>;
}

type CognitoAuth = {
    type: Input<'cognito'>;
    userPoolId: Input<string>;
    region: Input<string>;
    defaultAction?: Input<string>;
    appIdClientRegex?: Input<string>;
};
type ApiKeyAuth = {
    type: Input<'api-key'>;
};
type IamAuth = {
    type: Input<'iam'>;
};
type LambdaAuth = {
    type: Input<'lambda'>;
    functionArn: Input<ARN>;
    resultTtl?: Input<Duration>;
    tokenRegex?: Input<string>;
};
type Auth = CognitoAuth | ApiKeyAuth | IamAuth | LambdaAuth;
declare class GraphQLApi extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: {
        name: Input<string>;
        type?: Input<'graphql' | 'merged'>;
        role?: Input<ARN>;
        auth: Input<{
            default: Input<Auth>;
            additional?: Input<Input<Auth>[]>;
        }>;
        environment?: Input<Record<string, Input<string>>>;
        introspection?: Input<boolean>;
        visibility?: Input<boolean>;
    });
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    get realtime(): {
        uri: Output<string>;
        dns: Output<string>;
    };
    get graphql(): {
        uri: Output<string>;
        dns: Output<string>;
    };
    private formatAuth;
    toState(): {
        document: {
            additionalAuthenticationProviders: ({
                authenticationType: string;
                userPoolConfig?: undefined;
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                userPoolConfig: {
                    userPoolId: Input<string>;
                    defaultAction: Input<string>;
                };
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                lambdaAuthorizerConfig: {
                    authorizerUri: Input<`arn:${string}`>;
                };
                userPoolConfig?: undefined;
            })[];
            visibility: string;
            introspectionConfig: string;
            environmentVariables: string;
            authenticationType: string;
            userPoolConfig?: undefined;
            lambdaAuthorizerConfig?: undefined;
            name: Input<string>;
            apiType: string;
        } | {
            additionalAuthenticationProviders: ({
                authenticationType: string;
                userPoolConfig?: undefined;
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                userPoolConfig: {
                    userPoolId: Input<string>;
                    defaultAction: Input<string>;
                };
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                lambdaAuthorizerConfig: {
                    authorizerUri: Input<`arn:${string}`>;
                };
                userPoolConfig?: undefined;
            })[];
            visibility: string;
            introspectionConfig: string;
            environmentVariables: string;
            authenticationType: string;
            userPoolConfig: {
                userPoolId: Input<string>;
                defaultAction: Input<string>;
            };
            lambdaAuthorizerConfig?: undefined;
            name: Input<string>;
            apiType: string;
        } | {
            additionalAuthenticationProviders: ({
                authenticationType: string;
                userPoolConfig?: undefined;
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                userPoolConfig: {
                    userPoolId: Input<string>;
                    defaultAction: Input<string>;
                };
                lambdaAuthorizerConfig?: undefined;
            } | {
                authenticationType: string;
                lambdaAuthorizerConfig: {
                    authorizerUri: Input<`arn:${string}`>;
                };
                userPoolConfig?: undefined;
            })[];
            visibility: string;
            introspectionConfig: string;
            environmentVariables: string;
            authenticationType: string;
            lambdaAuthorizerConfig: {
                authorizerUri: Input<`arn:${string}`>;
            };
            userPoolConfig?: undefined;
            name: Input<string>;
            apiType: string;
        };
    };
}

type ProviderProps$8 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$5 = {
    apiId: string;
};
declare class GraphQLSchemaProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$8);
    own(id: string): boolean;
    get({ id }: GetProps<Document$5>): Promise<{}>;
    create({ document, assets }: CreateProps<Document$5>): Promise<string>;
    update({ oldDocument, newDocument, assets }: UpdateProps<Document$5>): Promise<string>;
    delete({ id }: DeleteProps<Document$5>): Promise<void>;
}

type GraphQLSchemaProps = {
    apiId: Input<string>;
    definition: Input<Asset>;
};
declare class GraphQLSchema extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: GraphQLSchemaProps);
    toState(): {
        assets: {
            definition: Input<Asset>;
        };
        document: {
            apiId: Input<string>;
        };
    };
}

type ResolverProps = {
    apiId: Input<string>;
    typeName: Input<string>;
    fieldName: Input<string>;
    functions: Input<Input<string>[]>;
    code: Input<Asset>;
};
declare class Resolver extends CloudControlApiResource {
    private props;
    constructor(id: string, props: ResolverProps);
    get arn(): Output<`arn:${string}`>;
    toState(): {
        assets: {
            code: Input<Asset>;
        };
        document: {
            ApiId: Input<string>;
            Kind: string;
            TypeName: Input<string>;
            FieldName: Input<string>;
            PipelineConfig: {
                Functions: Input<Input<string>[]>;
            };
            Code: {
                __ASSET__: string;
            };
            Runtime: {
                Name: string;
                RuntimeVersion: string;
            };
        };
    };
}

declare class SourceApiAssociation extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        mergedApiId: Input<string>;
        sourceApiId: Input<string>;
        mergeType?: 'manual' | 'auto';
    });
    toState(): {
        document: {
            MergedApiIdentifier: Input<string>;
            SourceApiIdentifier: Input<string>;
            SourceApiAssociationConfig: {
                MergeType: string;
            };
        };
    };
}

type index$k_DataSource = DataSource;
declare const index$k_DataSource: typeof DataSource;
type index$k_DataSourceProps = DataSourceProps;
type index$k_DataSourceProvider = DataSourceProvider;
declare const index$k_DataSourceProvider: typeof DataSourceProvider;
type index$k_DomainName = DomainName;
declare const index$k_DomainName: typeof DomainName;
type index$k_DomainNameApiAssociation = DomainNameApiAssociation;
declare const index$k_DomainNameApiAssociation: typeof DomainNameApiAssociation;
type index$k_FunctionConfiguration = FunctionConfiguration;
declare const index$k_FunctionConfiguration: typeof FunctionConfiguration;
type index$k_FunctionConfigurationProps = FunctionConfigurationProps;
type index$k_GraphQLApi = GraphQLApi;
declare const index$k_GraphQLApi: typeof GraphQLApi;
type index$k_GraphQLApiProvider = GraphQLApiProvider;
declare const index$k_GraphQLApiProvider: typeof GraphQLApiProvider;
type index$k_GraphQLSchema = GraphQLSchema;
declare const index$k_GraphQLSchema: typeof GraphQLSchema;
type index$k_GraphQLSchemaProps = GraphQLSchemaProps;
type index$k_GraphQLSchemaProvider = GraphQLSchemaProvider;
declare const index$k_GraphQLSchemaProvider: typeof GraphQLSchemaProvider;
type index$k_Resolver = Resolver;
declare const index$k_Resolver: typeof Resolver;
type index$k_ResolverProps = ResolverProps;
type index$k_SourceApiAssociation = SourceApiAssociation;
declare const index$k_SourceApiAssociation: typeof SourceApiAssociation;
declare namespace index$k {
  export {
    index$k_DataSource as DataSource,
    index$k_DataSourceProps as DataSourceProps,
    index$k_DataSourceProvider as DataSourceProvider,
    index$k_DomainName as DomainName,
    index$k_DomainNameApiAssociation as DomainNameApiAssociation,
    index$k_FunctionConfiguration as FunctionConfiguration,
    index$k_FunctionConfigurationProps as FunctionConfigurationProps,
    index$k_GraphQLApi as GraphQLApi,
    index$k_GraphQLApiProvider as GraphQLApiProvider,
    index$k_GraphQLSchema as GraphQLSchema,
    index$k_GraphQLSchemaProps as GraphQLSchemaProps,
    index$k_GraphQLSchemaProvider as GraphQLSchemaProvider,
    index$k_Resolver as Resolver,
    index$k_ResolverProps as ResolverProps,
    index$k_SourceApiAssociation as SourceApiAssociation,
  };
}

type ProviderProps$7 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    timeout?: Duration;
};
declare class CloudControlApiProvider implements CloudProvider {
    private props;
    protected client: CloudControlClient;
    constructor(props: ProviderProps$7);
    own(id: string): boolean;
    private progressStatus;
    private updateOperations;
    get({ id, type }: GetProps): Promise<any>;
    create({ type, document }: CreateProps): Promise<string>;
    update({ type, id, oldDocument, newDocument, remoteDocument }: UpdateProps): Promise<string>;
    delete({ type, id }: DeleteProps): Promise<void>;
}

type index$j_CloudControlApiProvider = CloudControlApiProvider;
declare const index$j_CloudControlApiProvider: typeof CloudControlApiProvider;
type index$j_CloudControlApiResource = CloudControlApiResource;
declare const index$j_CloudControlApiResource: typeof CloudControlApiResource;
declare namespace index$j {
  export {
    index$j_CloudControlApiProvider as CloudControlApiProvider,
    index$j_CloudControlApiResource as CloudControlApiResource,
  };
}

declare class CachePolicy extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        minTtl: Input<Duration>;
        maxTtl: Input<Duration>;
        defaultTtl: Input<Duration>;
        acceptBrotli?: Input<boolean>;
        acceptGzip?: Input<boolean>;
        cookies?: Input<Input<string>[]>;
        headers?: Input<Input<string>[]>;
        queries?: Input<Input<string>[]>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            CachePolicyConfig: {
                Name: Input<string>;
                MinTTL: bigint;
                MaxTTL: bigint;
                DefaultTTL: bigint;
                ParametersInCacheKeyAndForwardedToOrigin: {
                    EnableAcceptEncodingGzip: boolean;
                    EnableAcceptEncodingBrotli: boolean;
                    CookiesConfig: {
                        CookieBehavior: string;
                    };
                    HeadersConfig: {
                        HeaderBehavior: string;
                    };
                    QueryStringsConfig: {
                        QueryStringBehavior: string;
                    };
                };
            };
        };
    };
}

type AssociationType = 'viewer-request' | 'viewer-response' | 'origin-request' | 'origin-response';
type Origin = {
    id: Input<string>;
    domainName: Input<string>;
    path?: Input<string>;
    protocol?: Input<'http-only' | 'https-only' | 'match-viewer'>;
    headers?: Input<Record<string, Input<string>>>;
    originAccessControlId?: Input<string>;
    originAccessIdentityId?: Input<string>;
};
type OriginGroup = {
    id: Input<string>;
    members: Input<Input<string>[]>;
    statusCodes: Input<Input<number>[]>;
};
declare class Distribution extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        certificateArn?: Input<ARN>;
        priceClass?: Input<'100' | '200' | 'All'>;
        httpVersion?: Input<'http1.1' | 'http2' | 'http2and3' | 'http3'>;
        viewerProtocol?: Input<'allow-all' | 'https-only' | 'redirect-to-https'>;
        allowMethod?: Input<['GET', 'HEAD'] | ['GET', 'HEAD', 'OPTIONS'] | ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']>;
        cachePolicyId?: Input<string>;
        originRequestPolicyId?: Input<string>;
        targetOriginId: Input<string>;
        responseHeadersPolicyId?: Input<string>;
        aliases?: Input<Input<string>[]>;
        origins?: Input<Input<Origin>[]>;
        originGroups?: OriginGroup[];
        compress?: Input<boolean>;
        defaultRootObject?: Input<string>;
        associations?: Input<Input<{
            type: Input<AssociationType>;
            functionArn: Input<string>;
        }>[]>;
        lambdaAssociations?: Input<Input<{
            type: Input<AssociationType>;
            functionArn: Input<string>;
            includeBody?: Input<boolean>;
        }>[]>;
        customErrorResponses?: Input<Input<{
            errorCode: Input<string>;
            cacheMinTTL?: Input<Duration>;
            responseCode?: Input<number>;
            responsePath?: Input<string>;
        }>[]>;
    });
    get id(): Output<string>;
    get domainName(): Output<string>;
    get hostedZoneId(): string;
    get aliasTarget(): {
        dnsName: Output<string>;
        hostedZoneId: string;
        evaluateTargetHealth: boolean;
    };
    toState(): {
        document: {
            DistributionConfig: {
                Enabled: boolean;
                Aliases: Input<string>[];
                PriceClass: string;
                HttpVersion: "http1.1" | "http2" | "http2and3" | "http3";
                ViewerCertificate: {
                    SslSupportMethod: string;
                    AcmCertificateArn: Input<`arn:${string}`>;
                } | {
                    SslSupportMethod?: undefined;
                    AcmCertificateArn?: undefined;
                };
                Origins: {
                    OriginAccessControlId?: Input<string> | undefined;
                    S3OriginConfig?: {
                        OriginAccessIdentity: string;
                    } | undefined;
                    CustomOriginConfig?: {
                        OriginProtocolPolicy: Input<"http-only" | "https-only" | "match-viewer">;
                    } | undefined;
                    OriginPath?: Input<string> | undefined;
                    Id: Input<string>;
                    DomainName: Input<string>;
                    OriginCustomHeaders: {
                        HeaderName: string;
                        HeaderValue: Input<string>;
                    }[];
                }[];
                OriginGroups: {
                    Quantity: number;
                    Items: {
                        Id: Input<string>;
                        Members: {
                            Quantity: number;
                            Items: {
                                OriginId: Input<string>;
                            }[];
                        };
                        FailoverCriteria: {
                            StatusCodes: {
                                Quantity: number;
                                Items: Input<Input<number>[]>;
                            };
                        };
                    }[];
                };
                CustomErrorResponses: {
                    ErrorCode: Input<string>;
                }[];
                DefaultCacheBehavior: {
                    FunctionAssociations: {
                        EventType: Input<AssociationType>;
                        FunctionARN: Input<string>;
                    }[];
                    LambdaFunctionAssociations: {
                        EventType: Input<AssociationType>;
                        IncludeBody: boolean;
                        FunctionARN: Input<string>;
                    }[];
                    TargetOriginId: Input<string>;
                    ViewerProtocolPolicy: "https-only" | "allow-all" | "redirect-to-https";
                    AllowedMethods: ["GET", "HEAD"] | ["GET", "HEAD", "OPTIONS"] | ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"];
                    Compress: boolean;
                };
            };
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type ProviderProps$6 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$4 = {
    DistributionId: string;
    Versions: Array<undefined | string>;
    Paths: string[];
};
declare class InvalidateCacheProvider implements CloudProvider {
    protected client: CloudFrontClient;
    constructor(props: ProviderProps$6);
    own(id: string): boolean;
    private invalidate;
    get(): Promise<{}>;
    create({ document }: CreateProps<Document$4>): Promise<string>;
    update({ newDocument }: UpdateProps<Document$4>): Promise<string>;
    delete(): Promise<void>;
}

declare class InvalidateCache extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: {
        distributionId: Input<string>;
        versions: Input<Array<Input<string> | Input<string | undefined>>>;
        paths: Input<Input<string>[]>;
    });
    toState(): {
        document: {
            DistributionId: Input<string>;
            Versions: Input<(string | Output<string> | Output<string | undefined> | undefined)[]>;
            Paths: Input<Input<string>[]>;
        };
    };
}

declare class OriginAccessControl extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        type: Input<'mediastore' | 's3'>;
        behavior?: Input<'always' | 'never' | 'no-override'>;
        protocol?: Input<'sigv4'>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            OriginAccessControlConfig: {
                Name: Input<string>;
                OriginAccessControlOriginType: Input<"mediastore" | "s3">;
                SigningBehavior: "always" | "never" | "no-override";
                SigningProtocol: "sigv4";
            };
        };
    };
}

declare class OriginRequestPolicy extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        cookie?: Input<{
            behavior: Input<'all' | 'all-except' | 'none' | 'whitelist'>;
            values?: Input<Input<string>[]>;
        }>;
        header?: Input<{
            behavior: Input<'all-except' | 'all-viewer' | 'all-viewer-and-whitelist-cloudfront' | 'none' | 'whitelist'>;
            values?: Input<Input<string>[]>;
        }>;
        query?: Input<{
            behavior: Input<'all' | 'all-except' | 'none' | 'whitelist'>;
            values?: Input<Input<string>[]>;
        }>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            OriginRequestPolicyConfig: {
                Name: Input<string>;
                CookiesConfig: {
                    CookieBehavior: string;
                };
                HeadersConfig: {
                    HeaderBehavior: string;
                };
                QueryStringsConfig: {
                    QueryStringBehavior: string;
                };
            };
        };
    };
}

declare class ResponseHeadersPolicy extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        remove?: Input<Input<string>[]>;
        cors?: Input<{
            override?: Input<boolean>;
            maxAge?: Input<Duration>;
            exposeHeaders?: Input<Input<string>[]>;
            credentials?: Input<boolean>;
            headers?: Input<Input<string>[]>;
            origins?: Input<Input<string>[]>;
            methods?: Input<Array<Input<'GET' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'ALL'>>>;
        }>;
        contentSecurityPolicy?: Input<{
            override?: Input<boolean>;
            contentSecurityPolicy: Input<string>;
        }>;
        contentTypeOptions?: Input<{
            override?: Input<boolean>;
        }>;
        frameOptions?: Input<{
            override?: Input<boolean>;
            frameOption?: Input<'deny' | 'same-origin'>;
        }>;
        referrerPolicy?: Input<{
            override?: Input<boolean>;
            referrerPolicy?: Input<'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'>;
        }>;
        strictTransportSecurity?: Input<{
            maxAge?: Input<Duration>;
            includeSubdomains?: Input<boolean>;
            override?: Input<boolean>;
            preload?: Input<boolean>;
        }>;
        xssProtection?: Input<{
            override?: Input<boolean>;
            enable?: Input<boolean>;
            modeBlock?: Input<boolean>;
            reportUri?: Input<string>;
        }>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            ResponseHeadersPolicyConfig: {
                CorsConfig: {
                    OriginOverride: boolean;
                    AccessControlAllowCredentials: boolean;
                    AccessControlMaxAgeSec: bigint;
                    AccessControlAllowHeaders: {
                        Items: Input<string>[];
                    };
                    AccessControlAllowMethods: {
                        Items: Input<"GET" | "HEAD" | "OPTIONS" | "PUT" | "PATCH" | "POST" | "DELETE" | "ALL">[];
                    };
                    AccessControlAllowOrigins: {
                        Items: Input<string>[];
                    };
                    AccessControlExposeHeaders: {
                        Items: Input<string>[];
                    };
                };
                SecurityHeadersConfig: {
                    ContentTypeOptions: {
                        Override: boolean;
                    };
                    FrameOptions: {
                        Override: boolean;
                        FrameOption: string;
                    };
                    ReferrerPolicy: {
                        Override: boolean;
                        ReferrerPolicy: "same-origin" | "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
                    };
                    StrictTransportSecurity: {
                        Override: boolean;
                        Preload: boolean;
                        AccessControlMaxAgeSec: bigint;
                        IncludeSubdomains: boolean;
                    };
                    XSSProtection: {
                        Override: boolean;
                        ModeBlock: boolean;
                        Protection: boolean;
                    };
                    ContentSecurityPolicy?: {
                        Override: boolean;
                        ContentSecurityPolicy: string;
                    } | undefined;
                };
                RemoveHeadersConfig?: {
                    Items: {
                        Header: Input<string>;
                    }[];
                } | undefined;
                Name: Input<string>;
            };
        };
    };
}

type index$i_AssociationType = AssociationType;
type index$i_CachePolicy = CachePolicy;
declare const index$i_CachePolicy: typeof CachePolicy;
type index$i_Distribution = Distribution;
declare const index$i_Distribution: typeof Distribution;
type index$i_InvalidateCache = InvalidateCache;
declare const index$i_InvalidateCache: typeof InvalidateCache;
type index$i_InvalidateCacheProvider = InvalidateCacheProvider;
declare const index$i_InvalidateCacheProvider: typeof InvalidateCacheProvider;
type index$i_Origin = Origin;
type index$i_OriginAccessControl = OriginAccessControl;
declare const index$i_OriginAccessControl: typeof OriginAccessControl;
type index$i_OriginGroup = OriginGroup;
type index$i_OriginRequestPolicy = OriginRequestPolicy;
declare const index$i_OriginRequestPolicy: typeof OriginRequestPolicy;
type index$i_ResponseHeadersPolicy = ResponseHeadersPolicy;
declare const index$i_ResponseHeadersPolicy: typeof ResponseHeadersPolicy;
declare namespace index$i {
  export {
    index$i_AssociationType as AssociationType,
    index$i_CachePolicy as CachePolicy,
    index$i_Distribution as Distribution,
    index$i_InvalidateCache as InvalidateCache,
    index$i_InvalidateCacheProvider as InvalidateCacheProvider,
    index$i_Origin as Origin,
    index$i_OriginAccessControl as OriginAccessControl,
    index$i_OriginGroup as OriginGroup,
    index$i_OriginRequestPolicy as OriginRequestPolicy,
    index$i_ResponseHeadersPolicy as ResponseHeadersPolicy,
  };
}

declare class LogGroup extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        retention?: Input<Duration>;
    });
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    }[];
    toState(): {
        document: {
            LogGroupName: Input<string>;
        };
    };
}

type index$h_LogGroup = LogGroup;
declare const index$h_LogGroup: typeof LogGroup;
declare namespace index$h {
  export {
    index$h_LogGroup as LogGroup,
  };
}

type UserPoolClientProps = {
    name: Input<string>;
    userPoolId: Input<string>;
    enableTokenRevocation?: Input<boolean>;
    generateSecret?: Input<boolean>;
    preventUserExistenceErrors?: Input<boolean>;
    supportedIdentityProviders?: Input<Input<'amazon' | 'apple' | 'cognito' | 'facebook' | 'google'>[]>;
    validity?: {
        authSession?: Input<Duration>;
        accessToken?: Input<Duration>;
        idToken?: Input<Duration>;
        refreshToken?: Input<Duration>;
    };
    authFlows?: {
        adminUserPassword?: Input<boolean>;
        custom?: Input<boolean>;
        userPassword?: Input<boolean>;
        userSrp?: Input<boolean>;
    };
    readAttributes?: Input<Input<string>[]>;
    writeAttributes?: Input<Input<string>[]>;
};
declare class UserPoolClient extends CloudControlApiResource {
    private props;
    constructor(id: string, props: UserPoolClientProps);
    get id(): Output<string>;
    get name(): Output<string>;
    get userPoolId(): Output<string>;
    private formatAuthFlows;
    private formatIdentityProviders;
    toState(): {
        document: {
            TokenValidityUnits: {
                [x: string]: unknown;
            };
            ClientName: Input<string>;
            UserPoolId: Input<string>;
            ExplicitAuthFlows: string[];
            EnableTokenRevocation: boolean;
            GenerateSecret: boolean;
            PreventUserExistenceErrors: string;
        };
    };
}

type UserPoolDomainProps = {
    userPoolId: Input<string>;
    domain: Input<string>;
};
declare class UserPoolDomain extends CloudControlApiResource {
    private props;
    constructor(id: string, props: UserPoolDomainProps);
    toState(): {
        document: {
            UserPoolId: Input<string>;
            Domain: Input<string>;
        };
    };
}

type UserPoolProps = {
    name: Input<string>;
    deletionProtection?: Input<boolean>;
    allowUserRegistration?: Input<boolean>;
    username?: Input<{
        emailAlias?: Input<boolean>;
        caseSensitive?: Input<boolean>;
    }>;
    password?: Input<{
        minLength?: Input<number>;
        uppercase?: Input<boolean>;
        lowercase?: Input<boolean>;
        numbers?: Input<boolean>;
        symbols?: Input<boolean>;
        temporaryPasswordValidity?: Input<Duration>;
    }>;
    email?: Input<{
        type?: Input<'developer' | 'cognito-default'>;
        from?: Input<string>;
        replyTo?: Input<string>;
        sourceArn?: Input<ARN>;
    }>;
    triggers?: Input<{
        beforeToken?: Input<ARN>;
        beforeLogin?: Input<ARN>;
        afterLogin?: Input<ARN>;
        beforeRegister?: Input<ARN>;
        afterRegister?: Input<ARN>;
        customMessage?: Input<ARN>;
        userMigration?: Input<ARN>;
        emailSender?: Input<ARN>;
        defineChallange?: Input<ARN>;
        createChallange?: Input<ARN>;
        verifyChallange?: Input<ARN>;
    }>;
};
declare class UserPool extends CloudControlApiResource {
    private props;
    constructor(id: string, props: UserPoolProps);
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get providerName(): Output<string>;
    get providerUrl(): Output<string>;
    addClient(id: string, props: Omit<UserPoolClientProps, 'userPoolId'>): UserPoolClient;
    toState(): {
        document: {
            DeviceConfiguration: {
                DeviceOnlyRememberedOnUserPrompt: boolean;
            };
            AdminCreateUserConfig: {
                AllowAdminCreateUserOnly: boolean;
            };
            Policies: {
                PasswordPolicy: {
                    MinimumLength: number;
                    RequireUppercase: boolean;
                    RequireLowercase: boolean;
                    RequireNumbers: boolean;
                    RequireSymbols: boolean;
                    TemporaryPasswordValidityDays: bigint;
                };
            };
            LambdaConfig: {
                CustomEmailSender?: {
                    LambdaArn: Input<`arn:${string}`>;
                    LambdaVersion: string;
                } | undefined;
            };
            UsernameConfiguration: {
                CaseSensitive: boolean;
            };
            AliasAttributes?: string[] | undefined;
            AutoVerifiedAttributes?: string[] | undefined;
            Schema?: {
                AttributeDataType: string;
                Name: string;
                Required: boolean;
                Mutable: boolean;
                StringAttributeConstraints: {
                    MinLength: string;
                    MaxLength: string;
                };
            }[] | undefined;
            UserPoolName: Input<string>;
            DeletionProtection: string;
            AccountRecoverySetting: {
                RecoveryMechanisms: {
                    Name: string;
                    Priority: number;
                }[];
            };
        };
    };
}

type index$g_UserPool = UserPool;
declare const index$g_UserPool: typeof UserPool;
type index$g_UserPoolClient = UserPoolClient;
declare const index$g_UserPoolClient: typeof UserPoolClient;
type index$g_UserPoolClientProps = UserPoolClientProps;
type index$g_UserPoolDomain = UserPoolDomain;
declare const index$g_UserPoolDomain: typeof UserPoolDomain;
type index$g_UserPoolDomainProps = UserPoolDomainProps;
type index$g_UserPoolProps = UserPoolProps;
declare namespace index$g {
  export {
    index$g_UserPool as UserPool,
    index$g_UserPoolClient as UserPoolClient,
    index$g_UserPoolClientProps as UserPoolClientProps,
    index$g_UserPoolDomain as UserPoolDomain,
    index$g_UserPoolDomainProps as UserPoolDomainProps,
    index$g_UserPoolProps as UserPoolProps,
  };
}

type ProviderProps$5 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    tableName: string;
};
declare class DynamoDBStateProvider implements StateProvider$1 {
    private props;
    protected client: DynamoDB;
    protected id: number;
    constructor(props: ProviderProps$5);
    lock(urn: URN): Promise<() => Promise<void>>;
    get(urn: URN): Promise<any>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type ProviderProps$4 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$3 = {
    table: string;
    hash: string;
    sort?: string;
};
declare class TableItemProvider implements CloudProvider {
    protected client: DynamoDB;
    constructor(props: ProviderProps$4);
    own(id: string): boolean;
    private marshall;
    private primaryKey;
    get(): Promise<{}>;
    create({ document, assets }: CreateProps<Document$3>): Promise<string>;
    update({ id, oldDocument, newDocument, assets }: UpdateProps<Document$3>): Promise<string>;
    delete({ id }: DeleteProps<Document$3>): Promise<void>;
}

type Statement = {
    effect?: Input<'allow' | 'deny'>;
    actions: Input<Input<string>[]>;
    resources: Input<Input<ARN>[]>;
};
type PolicyDocumentVersion = '2012-10-17';
type PolicyDocument = {
    name: Input<string>;
    version?: Input<PolicyDocumentVersion>;
    statements: Input<Input<Statement>[]>;
};
declare const formatPolicyDocument: (policy: PolicyDocument) => {
    PolicyName: Input<string>;
    PolicyDocument: {
        Version: "2012-10-17";
        Statement: {
            Effect: string;
            Action: Input<Input<string>[]>;
            Resource: Input<Input<`arn:${string}`>[]>;
        }[];
    };
};
declare const formatStatement: (statement: Statement) => {
    Effect: string;
    Action: Input<Input<string>[]>;
    Resource: Input<Input<`arn:${string}`>[]>;
};
declare class RolePolicy extends CloudControlApiResource {
    private props;
    private statements;
    constructor(id: string, props: {
        role: Input<string>;
        name: Input<string>;
        version?: Input<PolicyDocumentVersion>;
        statements?: Input<Input<Statement>[]>;
    });
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get name(): Output<`arn:${string}`>;
    addStatement(...statements: Input<Statement>[]): this;
    toState(): {
        document: {
            PolicyName: Input<string>;
            PolicyDocument: {
                Version: "2012-10-17";
                Statement: {
                    Effect: string;
                    Action: Input<Input<string>[]>;
                    Resource: Input<Input<`arn:${string}`>[]>;
                }[];
            };
            RoleName: Input<string>;
        };
    };
}

declare class Role extends CloudControlApiResource {
    private props;
    private inlinePolicies;
    private managedPolicies;
    constructor(id: string, props?: {
        name?: Input<string>;
        path?: Input<string>;
        assumedBy?: string;
        policies?: PolicyDocument[];
    });
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    addManagedPolicy(...policies: Input<ARN>[]): this;
    addInlinePolicy(...policies: PolicyDocument[]): this;
    addPolicy(id: string, props: {
        name: Input<string>;
        version?: Input<PolicyDocumentVersion>;
        statements?: Input<Input<Statement>[]>;
    }): RolePolicy;
    toState(): {
        document: {
            AssumeRolePolicyDocument?: {
                Version: string;
                Statement: {
                    Action: string[];
                    Effect: string;
                    Principal: {
                        Service: string[];
                    };
                }[];
            } | undefined;
            ManagedPolicyArns: Input<`arn:${string}`>[];
            Policies: {
                PolicyName: Input<string>;
                PolicyDocument: {
                    Version: "2012-10-17";
                    Statement: {
                        Effect: string;
                        Action: Input<Input<string>[]>;
                        Resource: Input<Input<`arn:${string}`>[]>;
                    }[];
                };
            }[];
        };
    };
}

declare const fromAwsManagedPolicyName: (name: string) => `arn:aws:iam::aws:policy/service-role/${string}`;

type index$f_PolicyDocument = PolicyDocument;
type index$f_PolicyDocumentVersion = PolicyDocumentVersion;
type index$f_Role = Role;
declare const index$f_Role: typeof Role;
type index$f_RolePolicy = RolePolicy;
declare const index$f_RolePolicy: typeof RolePolicy;
type index$f_Statement = Statement;
declare const index$f_formatPolicyDocument: typeof formatPolicyDocument;
declare const index$f_formatStatement: typeof formatStatement;
declare const index$f_fromAwsManagedPolicyName: typeof fromAwsManagedPolicyName;
declare namespace index$f {
  export {
    index$f_PolicyDocument as PolicyDocument,
    index$f_PolicyDocumentVersion as PolicyDocumentVersion,
    index$f_Role as Role,
    index$f_RolePolicy as RolePolicy,
    index$f_Statement as Statement,
    index$f_formatPolicyDocument as formatPolicyDocument,
    index$f_formatStatement as formatStatement,
    index$f_fromAwsManagedPolicyName as fromAwsManagedPolicyName,
  };
}

type IndexProps = {
    hash: string;
    sort?: string;
    projection?: 'all' | 'keys-only';
};
type StreamViewType = 'keys-only' | 'new-image' | 'old-image' | 'new-and-old-images';
type TableProps = {
    name: Input<string>;
    hash: Input<string>;
    sort?: Input<string>;
    fields?: Input<Record<string, Input<'string' | 'number' | 'binary'>>>;
    class?: Input<'standard' | 'standard-infrequent-access'>;
    pointInTimeRecovery?: Input<boolean>;
    deletionProtection?: Input<boolean>;
    timeToLiveAttribute?: Input<string>;
    stream?: Input<StreamViewType>;
    indexes?: Record<string, IndexProps>;
};
declare class Table extends CloudControlApiResource {
    private props;
    private indexes;
    constructor(id: string, props: TableProps);
    get arn(): Output<`arn:${string}`>;
    get streamArn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    get hash(): Output<string>;
    get sort(): Output<string | undefined>;
    enableStream(viewType: StreamViewType): void;
    addIndex(name: string, props: IndexProps): void;
    addItem(id: string, item: Input<Asset>): TableItem;
    get streamPermissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    get permissions(): Statement[];
    private attributeDefinitions;
    toState(): {
        document: {
            GlobalSecondaryIndexes?: {
                IndexName: string;
                KeySchema: {
                    KeyType: string;
                    AttributeName: string;
                }[];
                Projection: {
                    ProjectionType: string;
                };
            }[] | undefined;
            StreamSpecification?: {
                StreamViewType: string;
            } | undefined;
            TimeToLiveSpecification?: {
                AttributeName: Input<string>;
                Enabled: boolean;
            } | undefined;
            TableName: Input<string>;
            BillingMode: string;
            KeySchema: {
                KeyType: string;
                AttributeName: Input<string>;
            }[];
            AttributeDefinitions: {
                AttributeName: string;
                AttributeType: "S" | "N" | "B";
            }[];
            TableClass: string;
            DeletionProtectionEnabled: boolean;
            PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: boolean;
            };
        };
    };
}

declare class TableItem extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: {
        table: Table;
        item: Input<Asset>;
    });
    toState(): {
        assets: {
            item: Input<Asset>;
        };
        document: {
            table: Output<string>;
            hash: Output<string>;
            sort: Output<string | undefined>;
        };
    };
}

type index$e_DynamoDBStateProvider = DynamoDBStateProvider;
declare const index$e_DynamoDBStateProvider: typeof DynamoDBStateProvider;
type index$e_IndexProps = IndexProps;
type index$e_StreamViewType = StreamViewType;
type index$e_Table = Table;
declare const index$e_Table: typeof Table;
type index$e_TableItem = TableItem;
declare const index$e_TableItem: typeof TableItem;
type index$e_TableItemProvider = TableItemProvider;
declare const index$e_TableItemProvider: typeof TableItemProvider;
type index$e_TableProps = TableProps;
declare namespace index$e {
  export {
    index$e_DynamoDBStateProvider as DynamoDBStateProvider,
    index$e_IndexProps as IndexProps,
    index$e_StreamViewType as StreamViewType,
    index$e_Table as Table,
    index$e_TableItem as TableItem,
    index$e_TableItemProvider as TableItemProvider,
    index$e_TableProps as TableProps,
  };
}

declare class Peer {
    readonly ip: string;
    readonly type: 'v4' | 'v6';
    static ipv4(cidrIp: string): Peer;
    static anyIpv4(): Peer;
    static ipv6(cidrIpv6: string): Peer;
    static anyIpv6(): Peer;
    constructor(ip: string, type: 'v4' | 'v6');
    toRuleJson(): {
        CidrIp: string;
        CidrIpv6?: undefined;
    } | {
        CidrIpv6: string;
        CidrIp?: undefined;
    };
    toString(): string;
}

declare class Vpc extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        cidrBlock: Input<Peer>;
    });
    get id(): Output<string>;
    get defaultNetworkAcl(): Output<string>;
    get defaultSecurityGroup(): Output<string>;
    toState(): {
        document: {
            CidrBlock: string;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

declare class VPCGatewayAttachment extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        vpcId: Input<string>;
        internetGatewayId: Input<string>;
    });
    get vpcId(): Output<string>;
    get internetGatewayId(): Output<string>;
    toState(): {
        document: {
            VpcId: Input<string>;
            InternetGatewayId: Input<string>;
        };
    };
}

declare class Subnet extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        vpcId: Input<string>;
        cidrBlock: Input<Peer>;
        availabilityZone: Input<string>;
    });
    get id(): Output<string>;
    get vpcId(): Output<string>;
    get availabilityZone(): Output<string>;
    get availabilityZoneId(): Output<string>;
    associateRouteTable(routeTableId: Input<string>): this;
    toState(): {
        document: {
            VpcId: Input<string>;
            CidrBlock: string;
            AvailabilityZone: Input<string>;
        };
    };
}

declare class SubnetRouteTableAssociation extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        subnetId: Input<string>;
        routeTableId: Input<string>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            SubnetId: Input<string>;
            RouteTableId: Input<string>;
        };
    };
}

declare enum Protocol {
    ALL = "-1",
    HOPOPT = "0",
    ICMP = "icmp",
    IGMP = "2",
    GGP = "3",
    IPV4 = "4",
    ST = "5",
    TCP = "tcp",
    CBT = "7",
    EGP = "8",
    IGP = "9",
    BBN_RCC_MON = "10",
    NVP_II = "11",
    PUP = "12",
    EMCON = "14",
    XNET = "15",
    CHAOS = "16",
    UDP = "udp",
    MUX = "18",
    DCN_MEAS = "19",
    HMP = "20",
    PRM = "21",
    XNS_IDP = "22",
    TRUNK_1 = "23",
    TRUNK_2 = "24",
    LEAF_1 = "25",
    LEAF_2 = "26",
    RDP = "27",
    IRTP = "28",
    ISO_TP4 = "29",
    NETBLT = "30",
    MFE_NSP = "31",
    MERIT_INP = "32",
    DCCP = "33",
    THREEPC = "34",
    IDPR = "35",
    XTP = "36",
    DDP = "37",
    IDPR_CMTP = "38",
    TPPLUSPLUS = "39",
    IL = "40",
    IPV6 = "41",
    SDRP = "42",
    IPV6_ROUTE = "43",
    IPV6_FRAG = "44",
    IDRP = "45",
    RSVP = "46",
    GRE = "47",
    DSR = "48",
    BNA = "49",
    ESP = "50",
    AH = "51",
    I_NLSP = "52",
    SWIPE = "53",
    NARP = "54",
    MOBILE = "55",
    TLSP = "56",
    SKIP = "57",
    ICMPV6 = "icmpv6",
    IPV6_NONXT = "59",
    IPV6_OPTS = "60",
    CFTP = "62",
    ANY_LOCAL = "63",
    SAT_EXPAK = "64",
    KRYPTOLAN = "65",
    RVD = "66",
    IPPC = "67",
    ANY_DFS = "68",
    SAT_MON = "69",
    VISA = "70",
    IPCV = "71",
    CPNX = "72",
    CPHB = "73",
    WSN = "74",
    PVP = "75",
    BR_SAT_MON = "76",
    SUN_ND = "77",
    WB_MON = "78",
    WB_EXPAK = "79",
    ISO_IP = "80",
    VMTP = "81",
    SECURE_VMTP = "82",
    VINES = "83",
    TTP = "84",
    IPTM = "84_",
    NSFNET_IGP = "85",
    DGP = "86",
    TCF = "87",
    EIGRP = "88",
    OSPFIGP = "89",
    SPRITE_RPC = "90",
    LARP = "91",
    MTP = "92",
    AX_25 = "93",
    IPIP = "94",
    MICP = "95",
    SCC_SP = "96",
    ETHERIP = "97",
    ENCAP = "98",
    ANY_ENC = "99",
    GMTP = "100",
    IFMP = "101",
    PNNI = "102",
    PIM = "103",
    ARIS = "104",
    SCPS = "105",
    QNX = "106",
    A_N = "107",
    IPCOMP = "108",
    SNP = "109",
    COMPAQ_PEER = "110",
    IPX_IN_IP = "111",
    VRRP = "112",
    PGM = "113",
    ANY_0_HOP = "114",
    L2_T_P = "115",
    DDX = "116",
    IATP = "117",
    STP = "118",
    SRP = "119",
    UTI = "120",
    SMP = "121",
    SM = "122",
    PTP = "123",
    ISIS_IPV4 = "124",
    FIRE = "125",
    CRTP = "126",
    CRUDP = "127",
    SSCOPMCE = "128",
    IPLT = "129",
    SPS = "130",
    PIPE = "131",
    SCTP = "132",
    FC = "133",
    RSVP_E2E_IGNORE = "134",
    MOBILITY_HEADER = "135",
    UDPLITE = "136",
    MPLS_IN_IP = "137",
    MANET = "138",
    HIP = "139",
    SHIM6 = "140",
    WESP = "141",
    ROHC = "142",
    ETHERNET = "143",
    EXPERIMENT_1 = "253",
    EXPERIMENT_2 = "254",
    RESERVED = "255"
}
interface PortProps {
    readonly protocol: Protocol;
    readonly from?: number;
    readonly to?: number;
}
declare class Port {
    static tcp(port: number): Port;
    static tcpRange(startPort: number, endPort: number): Port;
    static allTcp(): Port;
    static allTraffic(): Port;
    readonly protocol: Protocol;
    readonly from?: number;
    readonly to?: number;
    constructor(props: PortProps);
    toRuleJson(): {
        IpProtocol: Protocol;
        FromPort: number | undefined;
        ToPort: number | undefined;
    };
}

type Rule$1 = {
    peer: Input<Peer>;
    port: Input<Port>;
    description?: Input<string>;
};
declare class SecurityGroup extends CloudControlApiResource {
    private props;
    private ingress;
    private egress;
    constructor(id: string, props: {
        vpcId: Input<string>;
        name: Input<string>;
        description: Input<string>;
    });
    get id(): Output<string>;
    get name(): Output<string>;
    addIngressRule(rule: Input<Rule$1>): this;
    addEgressRule(rule: Input<Rule$1>): this;
    toState(): {
        document: {
            VpcId: Input<string>;
            GroupName: Input<string>;
            GroupDescription: Input<string>;
            SecurityGroupEgress: ({
                Description: string;
                IpProtocol: Protocol;
                FromPort: number | undefined;
                ToPort: number | undefined;
                CidrIp: string;
                CidrIpv6?: undefined;
            } | {
                Description: string;
                IpProtocol: Protocol;
                FromPort: number | undefined;
                ToPort: number | undefined;
                CidrIpv6: string;
                CidrIp?: undefined;
            })[];
            SecurityGroupIngress: ({
                Description: string;
                IpProtocol: Protocol;
                FromPort: number | undefined;
                ToPort: number | undefined;
                CidrIp: string;
                CidrIpv6?: undefined;
            } | {
                Description: string;
                IpProtocol: Protocol;
                FromPort: number | undefined;
                ToPort: number | undefined;
                CidrIpv6: string;
                CidrIp?: undefined;
            })[];
        };
    };
}

declare class Route extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        gatewayId: Input<string>;
        routeTableId: Input<string>;
        destination: Input<Peer>;
    });
    get gatewayId(): Output<string>;
    get routeTableId(): Output<string>;
    get vpcEndpointId(): Output<string>;
    get cidrBlock(): Output<Peer>;
    get destinationCidrBlock(): Output<Peer>;
    toState(): {
        document: {
            GatewayId: Input<string>;
            RouteTableId: Input<string>;
            DestinationCidrBlock: string;
        };
    };
}

declare class RouteTable extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        vpcId: Input<string>;
        name: Input<string>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            VpcId: Input<string>;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

declare class InternetGateway extends CloudControlApiResource {
    private props;
    constructor(id: string, props?: {
        name?: Input<string>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type index$d_InternetGateway = InternetGateway;
declare const index$d_InternetGateway: typeof InternetGateway;
type index$d_Peer = Peer;
declare const index$d_Peer: typeof Peer;
type index$d_Port = Port;
declare const index$d_Port: typeof Port;
type index$d_PortProps = PortProps;
type index$d_Protocol = Protocol;
declare const index$d_Protocol: typeof Protocol;
type index$d_Route = Route;
declare const index$d_Route: typeof Route;
type index$d_RouteTable = RouteTable;
declare const index$d_RouteTable: typeof RouteTable;
type index$d_SecurityGroup = SecurityGroup;
declare const index$d_SecurityGroup: typeof SecurityGroup;
type index$d_Subnet = Subnet;
declare const index$d_Subnet: typeof Subnet;
type index$d_SubnetRouteTableAssociation = SubnetRouteTableAssociation;
declare const index$d_SubnetRouteTableAssociation: typeof SubnetRouteTableAssociation;
type index$d_VPCGatewayAttachment = VPCGatewayAttachment;
declare const index$d_VPCGatewayAttachment: typeof VPCGatewayAttachment;
type index$d_Vpc = Vpc;
declare const index$d_Vpc: typeof Vpc;
declare namespace index$d {
  export {
    index$d_InternetGateway as InternetGateway,
    index$d_Peer as Peer,
    index$d_Port as Port,
    index$d_PortProps as PortProps,
    index$d_Protocol as Protocol,
    index$d_Route as Route,
    index$d_RouteTable as RouteTable,
    index$d_SecurityGroup as SecurityGroup,
    index$d_Subnet as Subnet,
    index$d_SubnetRouteTableAssociation as SubnetRouteTableAssociation,
    index$d_VPCGatewayAttachment as VPCGatewayAttachment,
    index$d_Vpc as Vpc,
  };
}

type ContentType = 'text/plain' | 'text/css' | 'text/html' | 'application/javascript' | 'application/json';
type ForwardProps = {
    targetGroups: Input<Input<ARN>[]>;
};
type FixedResponseProps = {
    statusCode: Input<number>;
    contentType?: Input<ContentType>;
    messageBody?: Input<string>;
};
type AuthenticateCognitoProps = {
    onUnauthenticated?: Input<'allow' | 'authenticate' | 'deny'>;
    scope?: Input<string>;
    session?: Input<{
        cookieName?: Input<string>;
        timeout?: Input<Duration>;
    }>;
    userPool: Input<{
        arn: Input<ARN>;
        clientId: Input<string>;
        domain: Input<string>;
    }>;
};
declare abstract class ListenerAction {
    static authCognito(props: AuthenticateCognitoProps): AuthCognitoAction;
    static fixedResponse(props: FixedResponseProps): FixedResponseAction;
    static forward(targets: ForwardProps['targetGroups']): ForwardAction;
    abstract toJSON(): object;
}
declare class ForwardAction extends ListenerAction {
    private props;
    constructor(props: ForwardProps);
    toJSON(): {
        Type: string;
        ForwardConfig: {
            TargetGroups: {
                TargetGroupArn: Input<`arn:${string}`>;
            }[];
        };
    };
}
declare class FixedResponseAction extends ListenerAction {
    private props;
    constructor(props: FixedResponseProps);
    toJSON(): {
        Type: string;
        FixedResponseConfig: {
            MessageBody?: Input<string> | undefined;
            ContentType?: Input<ContentType> | undefined;
            StatusCode: string;
        };
    };
}
declare class AuthCognitoAction extends ListenerAction {
    private props;
    constructor(props: AuthenticateCognitoProps);
    toJSON(): {
        Type: string;
        AuthenticateCognitoConfig: {
            OnUnauthenticatedRequest: "deny" | "allow" | "authenticate";
            Scope: string;
            SessionCookieName: string;
            SessionTimeout: bigint;
            UserPoolArn: Input<`arn:${string}`>;
            UserPoolClientId: Input<string>;
            UserPoolDomain: Input<string>;
        };
    };
}

type HttpRequestMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
type HttpRequestMethodsProps = {
    methods: Input<Input<HttpRequestMethod>[]>;
};
type PathPatternProps = {
    paths: Input<Input<string>[]>;
};
declare abstract class ListenerCondition {
    static httpRequestMethods(methods: HttpRequestMethodsProps['methods']): HttpRequestMethods;
    static pathPatterns(paths: PathPatternProps['paths']): PathPattern;
    abstract toJSON(): object;
}
declare class HttpRequestMethods extends ListenerCondition {
    private props;
    constructor(props: HttpRequestMethodsProps);
    toJSON(): {
        Field: string;
        HttpRequestMethodConfig: {
            Values: Input<Input<HttpRequestMethod>[]>;
        };
    };
}
declare class PathPattern extends ListenerCondition {
    private props;
    constructor(props: PathPatternProps);
    toJSON(): {
        Field: string;
        PathPatternConfig: {
            Values: Input<Input<string>[]>;
        };
    };
}

declare class ListenerRule extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        listenerArn: Input<ARN>;
        priority: Input<number>;
        conditions: Input<Input<ListenerCondition>[]>;
        actions: Input<Input<ListenerAction>[]>;
    });
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            ListenerArn: Input<`arn:${string}`>;
            Priority: Input<number>;
            Conditions: object[];
            Actions: {
                Order: number;
            }[];
        };
    };
}

declare class Listener extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        loadBalancerArn: Input<ARN>;
        port: Input<number>;
        protocol: Input<'http' | 'https' | 'geneve' | 'tcp' | 'tcp-udp' | 'tls' | 'udp'>;
        certificates: Input<Input<string>[]>;
        defaultActions?: Input<Input<ListenerAction>[]>;
    });
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            LoadBalancerArn: Input<`arn:${string}`>;
            Port: Input<number>;
            Protocol: string;
            Certificates: {
                CertificateArn: Input<string>;
            }[];
        };
    };
}

declare class LoadBalancer extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        securityGroups: Input<Input<string>[]>;
        subnets: Input<Input<string>[]>;
        type: Input<'application' | 'gateway' | 'network'>;
        schema?: Input<'internal' | 'internet-facing'>;
    });
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    get dnsName(): Output<string>;
    get fullName(): Output<string>;
    get hostedZoneId(): Output<string>;
    toState(): {
        document: {
            Name: Input<string>;
            Type: Input<"application" | "gateway" | "network">;
            Scheme: "internal" | "internet-facing";
            SecurityGroups: Input<Input<string>[]>;
            Subnets: Input<Input<string>[]>;
        };
    };
}

declare class TargetGroup extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        type: Input<'lambda'>;
        targets: Input<Input<ARN>[]>;
    });
    get arn(): Output<`arn:${string}`>;
    get fullName(): Output<string>;
    toState(): {
        document: {
            Name: Input<string>;
            TargetType: Input<"lambda">;
            Targets: {
                Id: Input<`arn:${string}`>;
            }[];
        };
    };
}

type index$c_AuthCognitoAction = AuthCognitoAction;
declare const index$c_AuthCognitoAction: typeof AuthCognitoAction;
type index$c_AuthenticateCognitoProps = AuthenticateCognitoProps;
type index$c_ContentType = ContentType;
type index$c_FixedResponseAction = FixedResponseAction;
declare const index$c_FixedResponseAction: typeof FixedResponseAction;
type index$c_FixedResponseProps = FixedResponseProps;
type index$c_ForwardAction = ForwardAction;
declare const index$c_ForwardAction: typeof ForwardAction;
type index$c_ForwardProps = ForwardProps;
type index$c_HttpRequestMethod = HttpRequestMethod;
type index$c_HttpRequestMethods = HttpRequestMethods;
declare const index$c_HttpRequestMethods: typeof HttpRequestMethods;
type index$c_HttpRequestMethodsProps = HttpRequestMethodsProps;
type index$c_Listener = Listener;
declare const index$c_Listener: typeof Listener;
type index$c_ListenerAction = ListenerAction;
declare const index$c_ListenerAction: typeof ListenerAction;
type index$c_ListenerCondition = ListenerCondition;
declare const index$c_ListenerCondition: typeof ListenerCondition;
type index$c_ListenerRule = ListenerRule;
declare const index$c_ListenerRule: typeof ListenerRule;
type index$c_LoadBalancer = LoadBalancer;
declare const index$c_LoadBalancer: typeof LoadBalancer;
type index$c_PathPattern = PathPattern;
declare const index$c_PathPattern: typeof PathPattern;
type index$c_PathPatternProps = PathPatternProps;
type index$c_TargetGroup = TargetGroup;
declare const index$c_TargetGroup: typeof TargetGroup;
declare namespace index$c {
  export {
    index$c_AuthCognitoAction as AuthCognitoAction,
    index$c_AuthenticateCognitoProps as AuthenticateCognitoProps,
    index$c_ContentType as ContentType,
    index$c_FixedResponseAction as FixedResponseAction,
    index$c_FixedResponseProps as FixedResponseProps,
    index$c_ForwardAction as ForwardAction,
    index$c_ForwardProps as ForwardProps,
    index$c_HttpRequestMethod as HttpRequestMethod,
    index$c_HttpRequestMethods as HttpRequestMethods,
    index$c_HttpRequestMethodsProps as HttpRequestMethodsProps,
    index$c_Listener as Listener,
    index$c_ListenerAction as ListenerAction,
    index$c_ListenerCondition as ListenerCondition,
    index$c_ListenerRule as ListenerRule,
    index$c_LoadBalancer as LoadBalancer,
    index$c_PathPattern as PathPattern,
    index$c_PathPatternProps as PathPatternProps,
    index$c_TargetGroup as TargetGroup,
  };
}

type RuleProps = {
    name: Input<string>;
    description?: Input<string>;
    enabled?: Input<boolean>;
    roleArn?: Input<ARN>;
    eventBusName?: Input<string>;
    eventPattern?: Input<string>;
    schedule: Input<string>;
    targets: Input<Input<RuleTarget>[]>;
};
type RuleTarget = {
    arn: Input<ARN>;
    id: Input<string>;
    input?: Input<unknown>;
};
declare class Rule extends CloudControlApiResource {
    private props;
    constructor(id: string, props: RuleProps);
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            Targets: {
                Arn: Input<`arn:${string}`>;
                Id: Input<string>;
            }[];
            Name: Input<string>;
        };
    };
}

type index$b_Rule = Rule;
declare const index$b_Rule: typeof Rule;
type index$b_RuleProps = RuleProps;
type index$b_RuleTarget = RuleTarget;
declare namespace index$b {
  export {
    index$b_Rule as Rule,
    index$b_RuleProps as RuleProps,
    index$b_RuleTarget as RuleTarget,
  };
}

type TopicRuleSqlVersion = '2015-10-08' | '2016-03-23' | 'beta';
type TopicRuleProps = {
    name: Input<string>;
    sql: Input<string>;
    sqlVersion?: Input<TopicRuleSqlVersion>;
    enabled?: Input<boolean>;
    actions: Input<Input<{
        lambda: Input<{
            functionArn: Input<ARN>;
        }>;
    }>[]>;
};
declare class TopicRule extends CloudControlApiResource {
    private props;
    constructor(id: string, props: TopicRuleProps);
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            RuleName: Input<string>;
            TopicRulePayload: {
                Sql: Input<string>;
                AwsIotSqlVersion: TopicRuleSqlVersion;
                RuleDisabled: boolean;
                Actions: {
                    Lambda: {
                        FunctionArn: Input<`arn:${string}`>;
                    };
                }[];
            };
        };
    };
}

type index$a_TopicRule = TopicRule;
declare const index$a_TopicRule: typeof TopicRule;
type index$a_TopicRuleProps = TopicRuleProps;
type index$a_TopicRuleSqlVersion = TopicRuleSqlVersion;
declare namespace index$a {
  export {
    index$a_TopicRule as TopicRule,
    index$a_TopicRuleProps as TopicRuleProps,
    index$a_TopicRuleSqlVersion as TopicRuleSqlVersion,
  };
}

type UrlProps = {
    targetArn: Input<ARN>;
    qualifier?: Input<string>;
    invokeMode?: Input<'buffered' | 'response-stream'>;
    authType?: Input<'aws-iam' | 'none'>;
    cors?: Input<{
        allow?: Input<{
            credentials?: Input<boolean>;
            headers?: Input<Input<string>[]>;
            methods?: Input<Input<string>[]>;
            origins?: Input<Input<string>[]>;
        }>;
        expose?: Input<{
            headers?: Input<Input<string>[]>;
        }>;
        maxAge?: Input<Duration>;
    }>;
};
declare class Url extends CloudControlApiResource {
    private props;
    constructor(id: string, props: UrlProps);
    get url(): Output<string>;
    get domain(): Output<string | undefined>;
    protected cors(): {
        [x: string]: unknown;
    };
    toState(): {
        document: {
            Cors: {
                [x: string]: unknown;
            };
            AuthType: string;
            InvokeMode: string;
            TargetFunctionArn: Input<`arn:${string}`>;
        };
    };
}

type PermissionProps = {
    functionArn: Input<ARN>;
    action?: Input<string>;
    principal: Input<string>;
    sourceArn?: Input<ARN>;
    urlAuthType?: Input<'none' | 'aws-iam'>;
};
declare class Permission extends CloudControlApiResource {
    private props;
    constructor(id: string, props: PermissionProps);
    toState(): {
        document: {
            FunctionName: Input<`arn:${string}`>;
            Action: string;
            Principal: Input<string>;
        };
    };
}

type Code = {
    bucket: Input<string>;
    key: Input<string>;
    version?: Input<string | undefined>;
} | {
    imageUri: Input<string>;
} | {
    zipFile: Input<string>;
};
declare const formatCode: (code: Code) => {
    S3Bucket: Input<string>;
    S3Key: Input<string>;
    S3ObjectVersion: Input<string | undefined>;
    ImageUri?: undefined;
    ZipFile?: undefined;
} | {
    ImageUri: Input<string>;
    S3Bucket?: undefined;
    S3Key?: undefined;
    S3ObjectVersion?: undefined;
    ZipFile?: undefined;
} | {
    ZipFile: Input<string>;
    S3Bucket?: undefined;
    S3Key?: undefined;
    S3ObjectVersion?: undefined;
    ImageUri?: undefined;
};

type FunctionProps = {
    name: Input<string>;
    code: Input<Code>;
    role: Input<ARN>;
    description?: Input<string>;
    runtime?: Input<'nodejs18.x' | 'nodejs20.x'>;
    handler?: Input<string>;
    architecture?: Input<'arm64' | 'x86_64'>;
    memorySize?: Input<Size>;
    timeout?: Input<Duration>;
    ephemeralStorageSize?: Input<Size>;
    environment?: Input<Record<string, Input<string>>>;
    reserved?: Input<number>;
    vpc?: Input<{
        securityGroupIds: Input<Input<string>[]>;
        subnetIds: Input<Input<string>[]>;
    }>;
    log?: Input<{
        format?: Input<'text' | 'json'>;
        level?: Input<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;
        system?: Input<'debug' | 'info' | 'warn'>;
    }>;
};
declare class Function extends CloudControlApiResource {
    private props;
    private environmentVariables;
    constructor(id: string, props: FunctionProps);
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    addEnvironment(name: string, value: Input<string>): this;
    setVpc(vpc: Input<{
        securityGroupIds: Input<Input<string>[]>;
        subnetIds: Input<Input<string>[]>;
    }>): this;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    toState(): {
        asset: {
            code: Input<Code>;
        };
        document: {
            Environment: {
                Variables: {
                    [x: string]: Input<string>;
                };
            };
            VpcConfig?: {
                SecurityGroupIds: Input<Input<string>[]>;
                SubnetIds: Input<Input<string>[]>;
            } | undefined;
            LoggingConfig?: {
                LogFormat: string;
                ApplicationLogLevel: string;
                SystemLogLevel: string;
            } | undefined;
            Code: {
                S3Bucket: Input<string>;
                S3Key: Input<string>;
                S3ObjectVersion: Input<string | undefined>;
                ImageUri?: undefined;
                ZipFile?: undefined;
            } | {
                ImageUri: Input<string>;
                S3Bucket?: undefined;
                S3Key?: undefined;
                S3ObjectVersion?: undefined;
                ZipFile?: undefined;
            } | {
                ZipFile: Input<string>;
                S3Bucket?: undefined;
                S3Key?: undefined;
                S3ObjectVersion?: undefined;
                ImageUri?: undefined;
            };
            EphemeralStorage: {
                Size: bigint;
            };
            FunctionName: Input<string>;
            Description: Input<string> | undefined;
            MemorySize: bigint;
            Handler: string;
            Runtime: "nodejs18.x" | "nodejs20.x";
            Timeout: bigint;
            Architectures: ("arm64" | "x86_64")[];
            Role: Input<`arn:${string}`>;
        };
    };
}

type EventInvokeConfigProps = {
    functionArn: Input<ARN>;
    maxEventAge?: Input<Duration>;
    onFailure?: Input<ARN>;
    onSuccess?: Input<ARN>;
    qualifier?: Input<string>;
    retryAttempts?: Input<number>;
};
declare class EventInvokeConfig extends CloudControlApiResource {
    private props;
    constructor(id: string, props: EventInvokeConfigProps);
    setOnFailure(arn: Input<ARN>): this;
    setOnSuccess(arn: Input<ARN>): this;
    toState(): {
        document: {
            DestinationConfig?: {
                OnSuccess?: {
                    Destination: Input<`arn:${string}`>;
                } | undefined;
                OnFailure?: {
                    Destination: Input<`arn:${string}`>;
                } | undefined;
            } | undefined;
            FunctionName: Input<`arn:${string}`>;
            Qualifier: string;
        };
    };
}

type StartingPosition = 'latest' | 'trim-horizon' | 'at-timestamp';
type EventSourceMappingProps = {
    functionArn: Input<ARN>;
    sourceArn: Input<ARN>;
    batchSize?: Input<number>;
    maxBatchingWindow?: Input<Duration>;
    maxConcurrency?: Input<number>;
    maxRecordAge?: Input<Duration>;
    bisectBatchOnError?: Input<boolean>;
    parallelizationFactor?: Input<number>;
    retryAttempts?: Input<number>;
    tumblingWindow?: Input<Duration>;
    onFailure?: Input<ARN>;
    startingPosition?: Input<StartingPosition>;
    startingPositionTimestamp?: Input<number>;
};
declare class EventSourceMapping extends CloudControlApiResource {
    private props;
    constructor(id: string, props: EventSourceMappingProps);
    setOnFailure(arn: Input<ARN>): this;
    toState(): {
        document: {
            DestinationConfig?: {
                OnFailure: {
                    Destination: Input<`arn:${string}`>;
                };
            } | undefined;
            ScalingConfig?: {
                MaximumConcurrency: Input<number>;
            } | undefined;
            Enabled: boolean;
            FunctionName: Input<`arn:${string}`>;
            EventSourceArn: Input<`arn:${string}`>;
        };
    };
}

type index$9_Code = Code;
type index$9_EventInvokeConfig = EventInvokeConfig;
declare const index$9_EventInvokeConfig: typeof EventInvokeConfig;
type index$9_EventInvokeConfigProps = EventInvokeConfigProps;
type index$9_EventSourceMapping = EventSourceMapping;
declare const index$9_EventSourceMapping: typeof EventSourceMapping;
type index$9_EventSourceMappingProps = EventSourceMappingProps;
type index$9_Function = Function;
declare const index$9_Function: typeof Function;
type index$9_FunctionProps = FunctionProps;
type index$9_Permission = Permission;
declare const index$9_Permission: typeof Permission;
type index$9_PermissionProps = PermissionProps;
type index$9_StartingPosition = StartingPosition;
type index$9_Url = Url;
declare const index$9_Url: typeof Url;
type index$9_UrlProps = UrlProps;
declare const index$9_formatCode: typeof formatCode;
declare namespace index$9 {
  export {
    index$9_Code as Code,
    index$9_EventInvokeConfig as EventInvokeConfig,
    index$9_EventInvokeConfigProps as EventInvokeConfigProps,
    index$9_EventSourceMapping as EventSourceMapping,
    index$9_EventSourceMappingProps as EventSourceMappingProps,
    index$9_Function as Function,
    index$9_FunctionProps as FunctionProps,
    index$9_Permission as Permission,
    index$9_PermissionProps as PermissionProps,
    index$9_StartingPosition as StartingPosition,
    index$9_Url as Url,
    index$9_UrlProps as UrlProps,
    index$9_formatCode as formatCode,
  };
}

type NodeType = 't4g.small' | 't4g.medium' | 'r6g.large' | 'r6g.xlarge' | 'r6g.2xlarge' | 'r6g.4xlarge' | 'r6g.8xlarge' | 'r6g.12xlarge' | 'r6g.16xlarge' | 'r6gd.xlarge' | 'r6gd.2xlarge' | 'r6gd.4xlarge' | 'r6gd.8xlarge';
declare class Cluster extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        aclName: Input<string>;
        subnetGroupName?: Input<string>;
        securityGroupIds?: Input<Input<string>[]>;
        name: Input<string>;
        description?: Input<string>;
        port?: Input<number>;
        engine?: Input<'6.2' | '7.0'>;
        type: Input<NodeType>;
        dataTiering?: Input<boolean>;
        shards?: Input<number>;
        replicasPerShard?: Input<number>;
        tls?: Input<boolean>;
        autoMinorVersionUpgrade?: Input<boolean>;
        maintenanceWindow?: Input<`${string}:${number}:${number}-${string}:${number}:${number}`>;
    });
    get arn(): Output<`arn:${string}`>;
    get address(): Output<string>;
    get port(): Output<number>;
    toState(): {
        document: {
            NodeType: string;
            NumReplicasPerShard: number;
            NumShards: number;
            TLSEnabled: boolean;
            DataTiering: string;
            AutoMinorVersionUpgrade: boolean;
            MaintenanceWindow: `${string}:${number}:${number}-${string}:${number}:${number}`;
            ACLName: Input<string>;
            EngineVersion: "6.2" | "7.0";
            ClusterName: Input<string>;
            ClusterEndpoint: {
                Port: Input<number> | undefined;
            };
            Port: Input<number> | undefined;
        };
    };
}

declare class SubnetGroup extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        subnetIds: Input<Input<string>[]>;
        name: Input<string>;
        description?: Input<string>;
    });
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    toState(): {
        document: {
            SubnetGroupName: Input<string>;
            SubnetIds: Input<Input<string>[]>;
        };
    };
}

type index$8_Cluster = Cluster;
declare const index$8_Cluster: typeof Cluster;
type index$8_NodeType = NodeType;
type index$8_SubnetGroup = SubnetGroup;
declare const index$8_SubnetGroup: typeof SubnetGroup;
declare namespace index$8 {
  export {
    index$8_Cluster as Cluster,
    index$8_NodeType as NodeType,
    index$8_SubnetGroup as SubnetGroup,
  };
}

declare class Collection extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        type: Input<'search' | 'timeseries' | 'vectorsearch'>;
        description?: Input<string>;
    });
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get endpoint(): Output<string>;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    toState(): {
        document: {
            Name: Input<string>;
            Type: string;
        };
    };
}

declare class SecurityPolicy extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        type: Input<'encryption' | 'network'>;
        policy: Input<string>;
        description?: Input<string>;
    });
    toState(): {
        document: {
            Name: Input<string>;
            Type: Input<"network" | "encryption">;
            Policy: Input<string>;
        };
    };
}

type index$7_Collection = Collection;
declare const index$7_Collection: typeof Collection;
type index$7_SecurityPolicy = SecurityPolicy;
declare const index$7_SecurityPolicy: typeof SecurityPolicy;
declare namespace index$7 {
  export {
    index$7_Collection as Collection,
    index$7_SecurityPolicy as SecurityPolicy,
  };
}

type ProviderProps$3 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$2 = {
    HostedZoneId: string;
    Name: string;
    Type: string;
    ResourceRecords?: string[];
    TTL?: number;
    Weight?: number;
    AliasTarget?: {
        DNSName: string;
        HostedZoneId: string;
        EvaluateTargetHealth: boolean | undefined;
    };
};
declare class RecordSetProvider implements CloudProvider {
    protected client: Route53Client;
    constructor(props: ProviderProps$3);
    own(id: string): boolean;
    get({ id, document }: GetProps<Document$2>): Promise<_aws_sdk_client_route_53.ResourceRecordSet | undefined>;
    private formatRecordSet;
    create({ document }: CreateProps<Document$2>): Promise<`${string}-${string}-${string}-${string}-${string}`>;
    update({ id, oldDocument, newDocument }: UpdateProps<Document$2>): Promise<string>;
    delete({ id, document }: DeleteProps<Document$2>): Promise<void>;
}

type HostedZoneProps = {
    name: Input<string>;
};
declare class HostedZone extends CloudControlApiResource {
    private props;
    constructor(id: string, props: HostedZoneProps);
    get id(): Output<string>;
    get name(): Output<string>;
    get nameServers(): Output<string[]>;
    addRecord(id: string, record: Input<Record$1>): RecordSet;
    toState(): {
        document: {
            Name: string;
        };
    };
}

type index$6_HostedZone = HostedZone;
declare const index$6_HostedZone: typeof HostedZone;
type index$6_HostedZoneProps = HostedZoneProps;
type index$6_RecordSet = RecordSet;
declare const index$6_RecordSet: typeof RecordSet;
type index$6_RecordSetProps = RecordSetProps;
type index$6_RecordSetProvider = RecordSetProvider;
declare const index$6_RecordSetProvider: typeof RecordSetProvider;
type index$6_RecordType = RecordType;
declare const index$6_formatRecordSet: typeof formatRecordSet;
declare namespace index$6 {
  export {
    index$6_HostedZone as HostedZone,
    index$6_HostedZoneProps as HostedZoneProps,
    Record$1 as Record,
    index$6_RecordSet as RecordSet,
    index$6_RecordSetProps as RecordSetProps,
    index$6_RecordSetProvider as RecordSetProvider,
    index$6_RecordType as RecordType,
    index$6_formatRecordSet as formatRecordSet,
  };
}

type BucketObjectProps = {
    bucket: Input<string>;
    key: Input<string>;
    body: Input<Asset>;
    cacheControl?: Input<string>;
    contentType?: Input<string>;
    metadata?: Input<Record<string, Input<string>>>;
};
declare class BucketObject extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: BucketObjectProps);
    get bucket(): Input<string>;
    get key(): Input<string>;
    get version(): Output<string | undefined>;
    get etag(): Output<string>;
    get checksum(): Output<string | undefined>;
    toState(): {
        assets: {
            body: Input<Asset>;
        };
        document: {
            Bucket: Input<string>;
            Key: Input<string>;
            CacheControl: Input<string> | undefined;
            ContentType: Input<string> | undefined;
            Metadata: Input<Record<string, Input<string>>> | undefined;
        };
    };
}

type BucketProps = {
    name?: Input<string>;
    versioning?: Input<boolean>;
    forceDelete?: Input<boolean>;
    website?: Input<{
        indexDocument?: Input<string>;
        errorDocument?: Input<string>;
    }>;
    cors?: Input<Input<{
        maxAge?: Input<Duration>;
        origins: Input<Input<string>[]>;
        methods: Input<Array<Input<'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE'>>>;
        headers?: Input<Input<string>[]>;
        exposeHeaders?: Input<Input<string>[]>;
    }>[]>;
};
declare class Bucket extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props?: BucketProps);
    get name(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get domainName(): Output<string>;
    get dealStackDomainName(): Output<string>;
    get regionalDomainName(): Output<string>;
    get url(): Output<string>;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    addObject(id: string, props: Omit<BucketObjectProps, 'bucket'>): BucketObject;
    toState(): {
        extra: {
            forceDelete: Input<boolean> | undefined;
        };
        document: {
            CorsConfiguration?: {
                CorsRules: {
                    MaxAge: Input<Duration> | undefined;
                    AllowedHeaders: Input<Input<string>[]> | undefined;
                    AllowedMethods: Input<Input<"GET" | "HEAD" | "PUT" | "POST" | "DELETE">[]>;
                    AllowedOrigins: Input<Input<string>[]>;
                    ExposedHeaders: Input<Input<string>[]> | undefined;
                }[];
            } | undefined;
            WebsiteConfiguration?: {
                IndexDocument: Input<string> | undefined;
                ErrorDocument: Input<string> | undefined;
            } | undefined;
            VersioningConfiguration?: {
                Status: string;
            } | undefined;
            BucketName: string;
        };
    };
}

type ProviderProps$2 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    cloudProvider: CloudProvider;
};
declare class BucketProvider implements CloudProvider {
    protected client: S3Client;
    protected cloudProvider: CloudProvider;
    constructor(props: ProviderProps$2);
    own(id: string): boolean;
    get(props: GetProps): Promise<any>;
    create(props: CreateProps): Promise<string>;
    update(props: UpdateProps): Promise<string>;
    delete(props: DeleteProps<{
        BucketName: string;
    }, {
        forceDelete: boolean;
    }>): Promise<void>;
    private emptyBucket;
    private deleteBucketObjects;
    private deleteBucketObjectVersions;
}

declare class BucketPolicy extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        bucketName: Input<string>;
        version?: Input<'2012-10-17'>;
        statements: Input<Input<{
            effect?: Input<'allow' | 'deny'>;
            principal?: Input<string>;
            actions: Input<Input<string>[]>;
            resources: Input<Input<ARN>[]>;
            sourceArn?: Input<ARN>;
        }>[]>;
    });
    toState(): {
        document: {
            Bucket: Input<string>;
            PolicyDocument: {
                Version: "2012-10-17";
                Statement: {
                    Condition?: {
                        StringEquals: {
                            'AWS:SourceArn': Input<`arn:${string}`>;
                        };
                    } | undefined;
                    Action: Input<Input<string>[]>;
                    Resource: Input<Input<`arn:${string}`>[]>;
                    Principal?: {
                        Service: Input<string>;
                    } | undefined;
                    Effect: string;
                }[];
            };
        };
    };
}

type ProviderProps$1 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$1 = {
    Bucket: string;
    Key: string;
    CacheControl?: string;
    ContentType?: string;
    Metadata?: Record<string, string>;
};
declare class BucketObjectProvider implements CloudProvider {
    protected client: S3Client;
    constructor(props: ProviderProps$1);
    own(id: string): boolean;
    get({ document }: GetProps<Document$1>): Promise<{
        VersionId: string | undefined;
        ETag: string | undefined;
        Checksum: _aws_sdk_client_s3.Checksum | undefined;
    }>;
    create({ document, assets }: CreateProps<Document$1>): Promise<string>;
    update({ oldDocument, newDocument, assets }: UpdateProps<Document$1>): Promise<string>;
    delete({ document }: DeleteProps<Document$1>): Promise<void>;
}

declare class StateProvider implements StateProvider$1 {
    lock(urn: URN): Promise<() => Promise<void>>;
    get(urn: URN): Promise<{}>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type index$5_Bucket = Bucket;
declare const index$5_Bucket: typeof Bucket;
type index$5_BucketObject = BucketObject;
declare const index$5_BucketObject: typeof BucketObject;
type index$5_BucketObjectProps = BucketObjectProps;
type index$5_BucketObjectProvider = BucketObjectProvider;
declare const index$5_BucketObjectProvider: typeof BucketObjectProvider;
type index$5_BucketPolicy = BucketPolicy;
declare const index$5_BucketPolicy: typeof BucketPolicy;
type index$5_BucketProps = BucketProps;
type index$5_BucketProvider = BucketProvider;
declare const index$5_BucketProvider: typeof BucketProvider;
type index$5_StateProvider = StateProvider;
declare const index$5_StateProvider: typeof StateProvider;
declare namespace index$5 {
  export {
    index$5_Bucket as Bucket,
    index$5_BucketObject as BucketObject,
    index$5_BucketObjectProps as BucketObjectProps,
    index$5_BucketObjectProvider as BucketObjectProvider,
    index$5_BucketPolicy as BucketPolicy,
    index$5_BucketProps as BucketProps,
    index$5_BucketProvider as BucketProvider,
    index$5_StateProvider as StateProvider,
  };
}

declare class EmailIdentity extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        emailIdentity: Input<string>;
        feedback?: Input<boolean>;
        configurationSetName?: Input<string>;
        dkim?: Input<'rsa-1024-bit' | 'rsa-2048-bit'>;
        rejectOnMxFailure?: Input<boolean>;
        mailFromDomain?: Input<string>;
    });
    private getDnsToken;
    get dkimDnsTokens(): Output<{
        name: string;
        value: string;
    }>[];
    get dkimRecords(): Record$1[];
    toState(): {
        document: {
            FeedbackAttributes: {
                EmailForwardingEnabled: boolean;
            };
            MailFromAttributes: {
                MailFromDomain: Input<string> | undefined;
                BehaviorOnMxFailure: string;
            };
            DkimAttributes?: {
                SigningEnabled: boolean;
            } | undefined;
            DkimSigningAttributes?: {
                NextSigningKeyLength: string;
            } | undefined;
            ConfigurationSetAttributes?: {
                ConfigurationSetName: Input<string>;
            } | undefined;
            EmailIdentity: Input<string>;
        };
    };
}

declare class ConfigurationSet extends CloudControlApiResource {
    private props;
    constructor(id: string, props: {
        name: Input<string>;
        engagementMetrics?: Input<boolean>;
        reputationMetrics?: Input<boolean>;
        sending?: Input<boolean>;
    });
    get name(): Output<string>;
    toState(): {
        document: {
            Name: Input<string>;
            VdmOptions: {
                DashboardOptions: {
                    EngagementMetrics: string;
                };
            };
            ReputationOptions: {
                ReputationMetricsEnabled: boolean;
            };
            SendingOptions: {
                SendingEnabled: boolean;
            };
        };
    };
}

type index$4_ConfigurationSet = ConfigurationSet;
declare const index$4_ConfigurationSet: typeof ConfigurationSet;
type index$4_EmailIdentity = EmailIdentity;
declare const index$4_EmailIdentity: typeof EmailIdentity;
declare namespace index$4 {
  export {
    index$4_ConfigurationSet as ConfigurationSet,
    index$4_EmailIdentity as EmailIdentity,
  };
}

type ProviderProps = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document = {
    TopicArn: ARN;
    Protocol: string;
    Endpoint: string | ARN;
};
declare class SubscriptionProvider implements CloudProvider {
    protected client: SNSClient;
    constructor(props: ProviderProps);
    own(id: string): boolean;
    get({ id }: GetProps<Document>): Promise<Record<string, string> | undefined>;
    create({ document }: CreateProps<Document>): Promise<string>;
    update({}: UpdateProps<Document>): Promise<string>;
    delete({ id }: DeleteProps<Document>): Promise<void>;
}

type SubscriptionProps = {
    topicArn: Input<ARN>;
    protocol: Input<'lambda' | 'email'>;
    endpoint: Input<string> | Input<ARN>;
};
declare class Subscription extends Resource {
    private props;
    cloudProviderId: string;
    constructor(id: string, props: SubscriptionProps);
    toState(): {
        document: {
            TopicArn: Input<`arn:${string}`>;
            Protocol: Input<"email" | "lambda">;
            Endpoint: string | Output<string> | Output<`arn:${string}`>;
        };
    };
}

type TopicProps = {
    name: Input<string>;
};
declare class Topic extends CloudControlApiResource {
    private props;
    constructor(id: string, props: TopicProps);
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    toState(): {
        document: {
            TopicName: Input<string>;
            DisplayName: Input<string>;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type index$3_Subscription = Subscription;
declare const index$3_Subscription: typeof Subscription;
type index$3_SubscriptionProps = SubscriptionProps;
type index$3_SubscriptionProvider = SubscriptionProvider;
declare const index$3_SubscriptionProvider: typeof SubscriptionProvider;
type index$3_Topic = Topic;
declare const index$3_Topic: typeof Topic;
type index$3_TopicProps = TopicProps;
declare namespace index$3 {
  export {
    index$3_Subscription as Subscription,
    index$3_SubscriptionProps as SubscriptionProps,
    index$3_SubscriptionProvider as SubscriptionProvider,
    index$3_Topic as Topic,
    index$3_TopicProps as TopicProps,
  };
}

type QueueProps = {
    name: Input<string>;
    retentionPeriod?: Input<Duration>;
    visibilityTimeout?: Input<Duration>;
    deliveryDelay?: Input<Duration>;
    receiveMessageWaitTime?: Input<Duration>;
    maxMessageSize?: Input<Size>;
    deadLetterArn?: Input<ARN>;
    maxReceiveCount?: Input<number>;
};
declare class Queue extends CloudControlApiResource {
    private props;
    constructor(id: string, props: QueueProps);
    setDeadLetter(arn: Input<ARN>): this;
    get arn(): Output<`arn:${string}`>;
    get url(): Output<string>;
    get name(): Output<string>;
    get permissions(): {
        actions: string[];
        resources: Output<`arn:${string}`>[];
    };
    toState(): {
        document: {
            RedrivePolicy?: {
                deadLetterTargetArn: Input<`arn:${string}`>;
                maxReceiveCount: number;
            } | undefined;
            QueueName: Input<string>;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
            DelaySeconds: bigint;
            MaximumMessageSize: bigint;
            MessageRetentionPeriod: bigint;
            ReceiveMessageWaitTimeSeconds: bigint;
            VisibilityTimeout: bigint;
        };
    };
}

type index$2_Queue = Queue;
declare const index$2_Queue: typeof Queue;
type index$2_QueueProps = QueueProps;
declare namespace index$2 {
  export {
    index$2_Queue as Queue,
    index$2_QueueProps as QueueProps,
  };
}

type ConfigProps = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    timeout?: Duration;
};
declare const createCloudProviders: (config: ConfigProps) => (CertificateProvider | CertificateValidationProvider | DataSourceProvider | GraphQLApiProvider | GraphQLSchemaProvider | CloudControlApiProvider | InvalidateCacheProvider | TableItemProvider | RecordSetProvider | BucketProvider | BucketObjectProvider | SubscriptionProvider)[];

type index$1_ARN = ARN;
declare const index$1_createCloudProviders: typeof createCloudProviders;
declare namespace index$1 {
  export {
    index$1_ARN as ARN,
    index$l as acm,
    index$k as appsync,
    index$j as cloudControlApi,
    index$i as cloudFront,
    index$h as cloudWatch,
    index$g as cognito,
    index$1_createCloudProviders as createCloudProviders,
    index$e as dynamodb,
    index$d as ec2,
    index$c as elb,
    index$b as events,
    index$f as iam,
    index$a as iot,
    index$9 as lambda,
    index$8 as memorydb,
    index$7 as openSearchServerless,
    index$6 as route53,
    index$5 as s3,
    index$4 as ses,
    index$3 as sns,
    index$2 as sqs,
  };
}

declare class LocalStateProvider implements StateProvider$1 {
    private props;
    constructor(props: {
        dir: string;
    });
    private stateFile;
    private lockFile;
    private mkdir;
    lock(urn: URN): Promise<() => Promise<void>>;
    get(urn: URN): Promise<AppState>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

declare namespace index {
  export {
    LocalStateProvider as StateProvider,
  };
}

export { App, AppState, Asset, CloudProvider, CreateProps, DeleteProps, FileAsset, GetProps, ImportValueNotFound, Input, Node, Output, RemoteAsset, ResolvedAsset, Resource, ResourceAlreadyExists, ResourceDeletionPolicy, ResourceDocument, ResourceError, ResourceExtra, ResourceNotFound, ResourceOperation, ResourcePolicies, ResourceState, Stack, StackError, StackOperation, StackState, StateProvider$1 as StateProvider, StringAsset, URN, Unwrap, UnwrapArray, UpdateProps, WorkSpace, all, index$1 as aws, findResources, flatten, index as local, unwrap };