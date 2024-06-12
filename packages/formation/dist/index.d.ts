import * as _aws_sdk_client_acm from '@aws-sdk/client-acm';
import { ACMClient } from '@aws-sdk/client-acm';
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { Duration } from '@awsless/duration';
import * as _aws_sdk_client_apigatewayv2 from '@aws-sdk/client-apigatewayv2';
import { IntegrationType } from '@aws-sdk/client-apigatewayv2';
import * as _aws_sdk_client_appsync from '@aws-sdk/client-appsync';
import { AppSyncClient } from '@aws-sdk/client-appsync';
import { CloudControlClient } from '@aws-sdk/client-cloudcontrol';
import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import * as _aws_sdk_client_cognito_identity_provider from '@aws-sdk/client-cognito-identity-provider';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import * as _aws_sdk_client_ec2 from '@aws-sdk/client-ec2';
import { EC2Client } from '@aws-sdk/client-ec2';
import { ECRClient } from '@aws-sdk/client-ecr';
import { LambdaClient } from '@aws-sdk/client-lambda';
import * as _aws_sdk_client_route_53 from '@aws-sdk/client-route-53';
import { Route53Client } from '@aws-sdk/client-route-53';
import * as _aws_sdk_client_s3 from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { Size } from '@awsless/size';

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
    token: string;
};
type UpdateProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    id: string;
    type: string;
    oldDocument: D;
    newDocument: D;
    remoteDocument: any;
    extra: E;
    oldAssets: Record<string, string>;
    newAssets: Record<string, ResolvedAsset>;
    token: string;
};
type DeleteProps<D = ResourceDocument, E = ResourceExtra> = {
    urn: URN;
    id: string;
    type: string;
    document: D;
    extra: E;
    assets: Record<string, string>;
    token: string;
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
    private listeners;
    private value;
    private resolved;
    constructor(resources: Resource[], cb: (resolve: (data: T) => void) => void);
    apply<N>(cb: (value: T) => N): Output<Awaited<N>>;
    valueOf(): T | undefined;
}
declare const findResources: (props: unknown) => Resource[];
declare const combine: <I extends [any, ...any[]]>(inputs: I) => Output<UnwrapArray<I>>;
type UnwrapArray<T extends Input<unknown>[]> = {
    [K in keyof T]: Unwrap<T[K]>;
};
type Unwrap<T> = T extends Output<infer V> ? V : T;
declare function unwrap<T extends Input<unknown>>(input: T): Unwrap<T>;
declare function unwrap<T extends Input<unknown>>(input: T, defaultValue: Unwrap<T>): Exclude<Unwrap<T>, undefined>;

declare class Stack extends Node {
    readonly app: App;
    readonly name: string;
    readonly exported: Record<string, Input<unknown>>;
    readonly dependencies: Set<Stack>;
    constructor(app: App, name: string);
    dependsOn(...stacks: Stack[]): this;
    get resources(): Resource[];
}

type URN = `urn:${string}`;
type ResourceDeletionPolicy = 'retain' | 'before-deployment' | 'after-deployment';
type ResourcePolicies = {
    deletionPolicy?: ResourceDeletionPolicy;
};
declare abstract class Resource extends Node {
    readonly parent: Node;
    readonly type: string;
    readonly identifier: string;
    private remoteDocument;
    private listeners;
    readonly dependencies: Set<Resource>;
    constructor(parent: Node, type: string, identifier: string, inputs?: unknown);
    abstract cloudProviderId: string;
    deletionPolicy: ResourceDeletionPolicy;
    abstract toState(): {
        extra?: Record<string, unknown>;
        assets?: Record<string, Input<Asset> | undefined>;
        document?: ResourceDocument;
    };
    get stack(): Stack;
    dependsOn(...resources: Resource[]): this;
    protected registerDependency(props: unknown): void;
    setRemoteDocument(remoteDocument: any): void;
    output<T = string>(getter: (remoteDocument: any) => T): Output<T>;
    protected attr<T extends Input<unknown>>(name: string, input: T, transform?: (value: Exclude<Unwrap<T>, undefined>) => unknown): {
        [x: string]: unknown;
    };
}

declare class Node {
    readonly parent: Node | undefined;
    readonly type: string;
    readonly identifier: string;
    readonly children: Node[];
    constructor(parent: Node | undefined, type: string, identifier: string);
    get urn(): URN;
}
declare const flatten: (node: Node) => Node[];

declare class App extends Node {
    readonly name: string;
    constructor(name: string);
    get stacks(): Stack[];
}

interface LockProvider$3 {
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

interface StateProvider$3 {
    get(urn: URN): Promise<AppState | undefined>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}
type AppState = {
    name: string;
    token?: string;
    stacks: Record<URN, StackState>;
};
type StackState = {
    name: string;
    dependencies: URN[];
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
type Options = {
    filters?: string[];
    token?: string;
};
declare class WorkSpace {
    protected props: {
        cloudProviders: CloudProvider[];
        stateProvider: StateProvider$3;
        lockProvider: LockProvider$3;
        concurrency?: number;
    };
    constructor(props: {
        cloudProviders: CloudProvider[];
        stateProvider: StateProvider$3;
        lockProvider: LockProvider$3;
        concurrency?: number;
    });
    private runGraph;
    deployApp(app: App, opt?: Options): Promise<AppState>;
    deleteApp(app: App, opt?: Options): Promise<void>;
    hydrate(app: App): Promise<void>;
    private getRemoteResource;
    private deployStackResources;
    private dependentsOn;
    private deleteStackResources;
    private healFromUnknownRemoteState;
}

declare class ResourceError extends Error {
    readonly urn: URN;
    readonly type: string;
    readonly id: string | undefined;
    readonly operation: ResourceOperation;
    static wrap(urn: URN, type: string, id: string | undefined, operation: ResourceOperation, error: unknown): ResourceError;
    constructor(urn: URN, type: string, id: string | undefined, operation: ResourceOperation, message: string);
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: Input<RecordSetProps>);
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    private validation;
    constructor(parent: Node, id: string, props: CertificateProps);
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

type ProviderProps$j = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Extra = {
    region?: string;
};
type Document$f = {
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
    constructor(props: ProviderProps$j);
    own(id: string): boolean;
    private wait;
    private client;
    get({ id, extra }: GetProps<Document$f, Extra>): Promise<_aws_sdk_client_acm.CertificateDetail>;
    create({ urn, document, extra }: CreateProps<Document$f, Extra>): Promise<string>;
    update(): Promise<string>;
    delete({ id, extra }: DeleteProps<Document$f, Extra>): Promise<void>;
}

type ProviderProps$i = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$e = {
    Region: string;
    CertificateArn: string;
};
declare class CertificateValidationProvider implements CloudProvider {
    private props;
    protected clients: Record<string, ACMClient>;
    constructor(props: ProviderProps$i);
    own(id: string): boolean;
    private client;
    private wait;
    get({ id, document }: GetProps<Document$e>): Promise<_aws_sdk_client_acm.CertificateDetail>;
    create({ document }: CreateProps<Document$e>): Promise<string>;
    update({ newDocument }: UpdateProps<Document$e>): Promise<string>;
    delete(): Promise<void>;
}

type ARN = `arn:${string}`;

type CertificateValidationProps = {
    certificateArn: Input<ARN>;
    region?: Input<string>;
};
declare class CertificateValidation extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: CertificateValidationProps);
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            Region: Input<string> | undefined;
            CertificateArn: Input<`arn:${string}`>;
        };
    };
}

type index$t_Certificate = Certificate;
declare const index$t_Certificate: typeof Certificate;
type index$t_CertificateProps = CertificateProps;
type index$t_CertificateProvider = CertificateProvider;
declare const index$t_CertificateProvider: typeof CertificateProvider;
type index$t_CertificateValidation = CertificateValidation;
declare const index$t_CertificateValidation: typeof CertificateValidation;
type index$t_CertificateValidationProps = CertificateValidationProps;
type index$t_CertificateValidationProvider = CertificateValidationProvider;
declare const index$t_CertificateValidationProvider: typeof CertificateValidationProvider;
type index$t_KeyAlgorithm = KeyAlgorithm;
declare namespace index$t {
  export {
    index$t_Certificate as Certificate,
    index$t_CertificateProps as CertificateProps,
    index$t_CertificateProvider as CertificateProvider,
    index$t_CertificateValidation as CertificateValidation,
    index$t_CertificateValidationProps as CertificateValidationProps,
    index$t_CertificateValidationProvider as CertificateValidationProvider,
    index$t_KeyAlgorithm as KeyAlgorithm,
  };
}

declare abstract class CloudControlApiResource extends Resource {
    readonly cloudProviderId = "aws-cloud-control-api";
}

declare class ApiMapping extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        domainName: Input<string>;
        apiId: Input<string>;
        stage: Input<string>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            DomainName: Input<string>;
            ApiId: Input<string>;
            Stage: Input<string>;
        };
    };
}

declare class Api extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        description?: Input<string>;
        protocolType: Input<'HTTP'>;
        cors?: Input<{
            allow?: Input<{
                credentials?: Input<boolean>;
                headers?: Input<Input<string>[]>;
                methods?: Input<Input<string>[]>;
                origins?: Input<Input<string>[]>;
            }>;
            expose?: Input<{
                headers?: string[];
            }>;
            maxAge?: Input<Duration>;
        }>;
    });
    get endpoint(): Output<string>;
    get id(): Output<string>;
    toState(): {
        document: {
            CorsConfiguration: {
                [x: string]: unknown;
            };
            Name: Input<string>;
            ProtocolType: Input<"HTTP">;
        };
    };
}

type ProviderProps$h = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    timeout?: Duration;
    maxAttempts?: number;
};
declare class CloudControlApiProvider implements CloudProvider {
    private props;
    protected client: CloudControlClient;
    constructor(props: ProviderProps$h);
    own(id: string): boolean;
    private send;
    private progressStatus;
    private updateOperations;
    get({ id, type }: GetProps): Promise<any>;
    create({ token, type, document }: CreateProps): Promise<string>;
    update({ token, type, id, oldDocument, newDocument, remoteDocument }: UpdateProps): Promise<string>;
    delete({ token, type, id }: DeleteProps): Promise<void>;
}

type index$s_CloudControlApiProvider = CloudControlApiProvider;
declare const index$s_CloudControlApiProvider: typeof CloudControlApiProvider;
type index$s_CloudControlApiResource = CloudControlApiResource;
declare const index$s_CloudControlApiResource: typeof CloudControlApiResource;
declare namespace index$s {
  export {
    index$s_CloudControlApiProvider as CloudControlApiProvider,
    index$s_CloudControlApiResource as CloudControlApiResource,
  };
}

declare class DomainName$1 extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        certificates: Input<Input<{
            certificateArn?: Input<ARN>;
            certificateName?: Input<string>;
            endpointType?: Input<string>;
            securityPolicy?: Input<'TLS_1_2' | 'TLS_1_0'>;
        }>[]>;
    });
    get name(): Output<string>;
    get regionalDomainName(): Output<string>;
    get regionalHostedZoneId(): Output<string>;
    toState(): {
        document: {
            DomainName: Input<string>;
            DomainNameConfigurations: {
                [x: string]: unknown;
            }[];
        };
    };
}

type ProviderProps$g = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$d = {
    ApiId: string;
    IntegrationType: IntegrationType;
    IntegrationUri: string;
    IntegrationMethod: string;
    PayloadFormatVersion: '1.0' | '2.0';
    Description?: string;
};
declare class IntegrationProvider implements CloudProvider {
    private client;
    constructor(props: ProviderProps$g);
    own(id: string): boolean;
    get({ id, document }: GetProps<Document$d>): Promise<_aws_sdk_client_apigatewayv2.GetIntegrationCommandOutput>;
    create({ document }: CreateProps<Document$d>): Promise<string>;
    update({ id, oldDocument, newDocument }: UpdateProps<Document$d>): Promise<string>;
    delete({ id, document }: DeleteProps<Document$d>): Promise<void>;
}

declare class Integration extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
        apiId: Input<string>;
        description?: Input<string>;
        type: Input<IntegrationType>;
        uri: Input<string>;
        method: Input<string>;
        payloadFormatVersion?: Input<'1.0' | '2.0'>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            ApiId: Input<string>;
            IntegrationType: Input<IntegrationType>;
            IntegrationUri: Input<string>;
            IntegrationMethod: Input<string>;
            PayloadFormatVersion: "1.0" | "2.0";
        };
    };
}

declare class Route$1 extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        apiId: Input<string>;
        routeKey: Input<string>;
        target: Input<string>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            ApiId: Input<string>;
            RouteKey: Input<string>;
            Target: Input<string>;
        };
    };
}

type ProviderProps$f = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$c = {
    ApiId: string;
    StageName: string;
    AutoDeploy: boolean;
    DeploymentId?: string;
    Description?: string;
};
declare class StageProvider implements CloudProvider {
    private client;
    constructor(props: ProviderProps$f);
    own(id: string): boolean;
    get({ document }: GetProps<Document$c>): Promise<_aws_sdk_client_apigatewayv2.GetStageCommandOutput>;
    create({ document }: CreateProps<Document$c>): Promise<string>;
    update({ oldDocument, newDocument }: UpdateProps<Document$c>): Promise<string>;
    delete({ document }: DeleteProps<Document$c>): Promise<void>;
}

declare class Stage extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
        apiId: Input<string>;
        deploymentId?: Input<string>;
        name: Input<string>;
        description?: Input<string>;
        autoDeploy?: Input<boolean>;
    });
    get id(): Output<string>;
    get name(): Output<string>;
    toState(): {
        document: {
            ApiId: Input<string>;
            StageName: Input<string>;
            AutoDeploy: boolean;
        };
    };
}

type index$r_Api = Api;
declare const index$r_Api: typeof Api;
type index$r_ApiMapping = ApiMapping;
declare const index$r_ApiMapping: typeof ApiMapping;
type index$r_Integration = Integration;
declare const index$r_Integration: typeof Integration;
type index$r_IntegrationProvider = IntegrationProvider;
declare const index$r_IntegrationProvider: typeof IntegrationProvider;
type index$r_Stage = Stage;
declare const index$r_Stage: typeof Stage;
type index$r_StageProvider = StageProvider;
declare const index$r_StageProvider: typeof StageProvider;
declare namespace index$r {
  export {
    index$r_Api as Api,
    index$r_ApiMapping as ApiMapping,
    DomainName$1 as DomainName,
    index$r_Integration as Integration,
    index$r_IntegrationProvider as IntegrationProvider,
    Route$1 as Route,
    index$r_Stage as Stage,
    index$r_StageProvider as StageProvider,
  };
}

type ProviderProps$e = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$b = any;
declare class DataSourceProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$e);
    own(id: string): boolean;
    get({ document }: GetProps<Document$b>): Promise<_aws_sdk_client_appsync.DataSource>;
    create({ document }: CreateProps<Document$b>): Promise<string>;
    update({ id, oldDocument, newDocument }: UpdateProps<Document$b>): Promise<string>;
    delete({ document }: DeleteProps<Document$b>): Promise<void>;
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: DataSourceProps);
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

declare class DomainNameApiAssociation extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: FunctionConfigurationProps);
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

type ProviderProps$d = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$a = any;
declare class GraphQLApiProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$d);
    own(id: string): boolean;
    get({ id }: GetProps<Document$a>): Promise<_aws_sdk_client_appsync.GraphqlApi>;
    create({ document }: CreateProps<Document$a>): Promise<string>;
    update({ id, newDocument }: UpdateProps<Document$a>): Promise<string>;
    delete({ id }: DeleteProps<Document$a>): Promise<void>;
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
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

type ProviderProps$c = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$9 = {
    apiId: string;
};
declare class GraphQLSchemaProvider implements CloudProvider {
    protected client: AppSyncClient;
    constructor(props: ProviderProps$c);
    own(id: string): boolean;
    private waitStatusComplete;
    get(): Promise<{}>;
    create({ document, assets }: CreateProps<Document$9>): Promise<string>;
    update({ oldDocument, newDocument, newAssets }: UpdateProps<Document$9>): Promise<string>;
    delete({ id }: DeleteProps<Document$9>): Promise<void>;
}

type GraphQLSchemaProps = {
    apiId: Input<string>;
    definition: Input<Asset>;
};
declare class GraphQLSchema extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: GraphQLSchemaProps);
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: ResolverProps);
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$q_DataSource = DataSource;
declare const index$q_DataSource: typeof DataSource;
type index$q_DataSourceProps = DataSourceProps;
type index$q_DataSourceProvider = DataSourceProvider;
declare const index$q_DataSourceProvider: typeof DataSourceProvider;
type index$q_DomainName = DomainName;
declare const index$q_DomainName: typeof DomainName;
type index$q_DomainNameApiAssociation = DomainNameApiAssociation;
declare const index$q_DomainNameApiAssociation: typeof DomainNameApiAssociation;
type index$q_FunctionConfiguration = FunctionConfiguration;
declare const index$q_FunctionConfiguration: typeof FunctionConfiguration;
type index$q_FunctionConfigurationProps = FunctionConfigurationProps;
type index$q_GraphQLApi = GraphQLApi;
declare const index$q_GraphQLApi: typeof GraphQLApi;
type index$q_GraphQLApiProvider = GraphQLApiProvider;
declare const index$q_GraphQLApiProvider: typeof GraphQLApiProvider;
type index$q_GraphQLSchema = GraphQLSchema;
declare const index$q_GraphQLSchema: typeof GraphQLSchema;
type index$q_GraphQLSchemaProps = GraphQLSchemaProps;
type index$q_GraphQLSchemaProvider = GraphQLSchemaProvider;
declare const index$q_GraphQLSchemaProvider: typeof GraphQLSchemaProvider;
type index$q_Resolver = Resolver;
declare const index$q_Resolver: typeof Resolver;
type index$q_ResolverProps = ResolverProps;
type index$q_SourceApiAssociation = SourceApiAssociation;
declare const index$q_SourceApiAssociation: typeof SourceApiAssociation;
declare namespace index$q {
  export {
    index$q_DataSource as DataSource,
    index$q_DataSourceProps as DataSourceProps,
    index$q_DataSourceProvider as DataSourceProvider,
    index$q_DomainName as DomainName,
    index$q_DomainNameApiAssociation as DomainNameApiAssociation,
    index$q_FunctionConfiguration as FunctionConfiguration,
    index$q_FunctionConfigurationProps as FunctionConfigurationProps,
    index$q_GraphQLApi as GraphQLApi,
    index$q_GraphQLApiProvider as GraphQLApiProvider,
    index$q_GraphQLSchema as GraphQLSchema,
    index$q_GraphQLSchemaProps as GraphQLSchemaProps,
    index$q_GraphQLSchemaProvider as GraphQLSchemaProvider,
    index$q_Resolver as Resolver,
    index$q_ResolverProps as ResolverProps,
    index$q_SourceApiAssociation as SourceApiAssociation,
  };
}

type NotificationType = 'launch' | 'launch-error' | 'terminate' | 'terminate-error';
type TerminationPolicy = 'default' | 'allocation-strategy' | 'oldest-launch-template' | 'oldest-launch-configuration' | 'closest-to-next-instance-hour' | 'newest-instance' | 'oldest-instance';
type AutoScalingGroupProps = {
    name: Input<string>;
    subnets: Input<Input<string>[]>;
    launchTemplate: Input<{
        id: Input<string>;
        version: Input<string>;
    }>;
    maxSize: Input<number>;
    minSize: Input<number>;
    defaultInstanceWarmup?: Input<Duration>;
    desiredCapacity?: Input<number>;
    maxHealthyPercentage?: Input<number>;
    minHealthyPercentage?: Input<number>;
    terminationPolicy?: Input<Input<TerminationPolicy>[]>;
    notifications?: Input<Input<{
        type: Input<Input<NotificationType>[]>;
        topic: Input<ARN>;
    }>[]>;
};
declare class AutoScalingGroup extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: AutoScalingGroupProps);
    get name(): Output<string>;
    toState(): {
        document: {
            DesiredCapacityType: string;
            InstanceMaintenancePolicy: {
                MaxHealthyPercentage: Input<number> | undefined;
                MinHealthyPercentage: Input<number> | undefined;
            };
            LaunchTemplate: {
                LaunchTemplateSpecification: {
                    LaunchTemplateId: Input<string>;
                    Version: Input<string>;
                };
            };
            MaxSize: Input<number>;
            MinSize: Input<number>;
            NotificationConfigurations: {
                NotificationTypes: string[];
                TopicARN: Input<`arn:${string}`>;
            }[];
            TerminationPolicies: string[];
            VPCZoneIdentifier: Input<Input<string>[]>;
            AutoScalingGroupName: Input<string>;
        };
    };
}

type index$p_AutoScalingGroup = AutoScalingGroup;
declare const index$p_AutoScalingGroup: typeof AutoScalingGroup;
type index$p_AutoScalingGroupProps = AutoScalingGroupProps;
type index$p_NotificationType = NotificationType;
type index$p_TerminationPolicy = TerminationPolicy;
declare namespace index$p {
  export {
    index$p_AutoScalingGroup as AutoScalingGroup,
    index$p_AutoScalingGroupProps as AutoScalingGroupProps,
    index$p_NotificationType as NotificationType,
    index$p_TerminationPolicy as TerminationPolicy,
  };
}

declare class CachePolicy extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type ProviderProps$b = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$8 = {
    DistributionId: string;
    Versions: Array<undefined | string>;
    Paths: string[];
};
declare class InvalidateCacheProvider implements CloudProvider {
    protected client: CloudFrontClient;
    constructor(props: ProviderProps$b);
    own(id: string): boolean;
    private invalidate;
    get(): Promise<{}>;
    create({ document }: CreateProps<Document$8>): Promise<string>;
    update({ newDocument }: UpdateProps<Document$8>): Promise<string>;
    delete(): Promise<void>;
}

declare class InvalidateCache extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$o_AssociationType = AssociationType;
type index$o_CachePolicy = CachePolicy;
declare const index$o_CachePolicy: typeof CachePolicy;
type index$o_Distribution = Distribution;
declare const index$o_Distribution: typeof Distribution;
type index$o_InvalidateCache = InvalidateCache;
declare const index$o_InvalidateCache: typeof InvalidateCache;
type index$o_InvalidateCacheProvider = InvalidateCacheProvider;
declare const index$o_InvalidateCacheProvider: typeof InvalidateCacheProvider;
type index$o_Origin = Origin;
type index$o_OriginAccessControl = OriginAccessControl;
declare const index$o_OriginAccessControl: typeof OriginAccessControl;
type index$o_OriginGroup = OriginGroup;
type index$o_OriginRequestPolicy = OriginRequestPolicy;
declare const index$o_OriginRequestPolicy: typeof OriginRequestPolicy;
type index$o_ResponseHeadersPolicy = ResponseHeadersPolicy;
declare const index$o_ResponseHeadersPolicy: typeof ResponseHeadersPolicy;
declare namespace index$o {
  export {
    index$o_AssociationType as AssociationType,
    index$o_CachePolicy as CachePolicy,
    index$o_Distribution as Distribution,
    index$o_InvalidateCache as InvalidateCache,
    index$o_InvalidateCacheProvider as InvalidateCacheProvider,
    index$o_Origin as Origin,
    index$o_OriginAccessControl as OriginAccessControl,
    index$o_OriginGroup as OriginGroup,
    index$o_OriginRequestPolicy as OriginRequestPolicy,
    index$o_ResponseHeadersPolicy as ResponseHeadersPolicy,
  };
}

type ProviderProps$a = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$7 = {
    UserPoolId: string;
    LambdaConfig: {
        PreAuthentication?: string;
        PostAuthentication?: string;
        PostConfirmation?: string;
        PreSignUp?: string;
        PreTokenGeneration?: string;
        CustomMessage?: string;
        UserMigration?: string;
        DefineAuthChallenge?: string;
        CreateAuthChallenge?: string;
        VerifyAuthChallengeResponse?: string;
    };
};
declare class LambdaTriggersProvider implements CloudProvider {
    protected client: CognitoIdentityProviderClient;
    constructor(props: ProviderProps$a);
    own(id: string): boolean;
    private updateUserPool;
    get({ document }: GetProps<Document$7>): Promise<_aws_sdk_client_cognito_identity_provider.LambdaConfigType>;
    create({ document }: CreateProps<Document$7>): Promise<string>;
    update({ oldDocument, newDocument }: UpdateProps<Document$7>): Promise<string>;
    delete({ document }: DeleteProps<Document$7>): Promise<void>;
}

type ProviderProps$9 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$6 = {
    table: string;
    hash: string;
    sort?: string;
};
declare class TableItemProvider implements CloudProvider {
    protected client: DynamoDB;
    constructor(props: ProviderProps$9);
    own(id: string): boolean;
    private marshall;
    private primaryKey;
    get(): Promise<{}>;
    create({ document, assets }: CreateProps<Document$6>): Promise<string>;
    update({ id, oldDocument, newDocument, newAssets }: UpdateProps<Document$6>): Promise<string>;
    delete({ id }: DeleteProps<Document$6>): Promise<void>;
}

declare class Instance extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
        name: string;
        launchTemplate: Input<{
            id: Input<string>;
            version: Input<string>;
        }>;
        keyName?: Input<string>;
        subnetId?: Input<string>;
        securityGroupIds?: Input<Input<string>[]>;
        iamInstanceProfile?: Input<ARN>;
        tags?: Input<Record<string, Input<string>>>;
    });
    get id(): Output<string>;
    get privateDnsName(): Output<string>;
    get privateIp(): Output<string>;
    get publicDnsName(): Output<string>;
    get publicIp(): Output<string>;
    toState(): {
        document: {
            LaunchTemplate: {
                LaunchTemplateId: Input<string>;
                Version: Input<string>;
            };
            KeyName: Input<string> | undefined;
            SubnetId: Input<string> | undefined;
            SecurityGroupIds: Input<Input<string>[]> | undefined;
            IamInstanceProfile: Input<`arn:${string}`> | undefined;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

declare class InstanceConnectEndpoint extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        subnetId: Input<string>;
        preserveClientIp?: Input<boolean>;
        securityGroupIds?: Input<Input<string>[]>;
        tags?: Input<Record<string, Input<string>>>;
    });
    get id(): Output<string>;
    toState(): {
        document: {
            PreserveClientIp: Input<boolean> | undefined;
            SecurityGroupIds: Input<Input<string>[]> | undefined;
            SubnetId: Input<string>;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type ProviderProps$8 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
};
type Document$5 = {
    LaunchTemplate: {
        LaunchTemplateId: string;
        Version: string;
    };
    KeyName?: string;
    SubnetId?: string;
    SecurityGroupIds?: string[];
    IamInstanceProfile?: ARN;
    Tags?: {
        Key: string;
        Value: string;
    }[];
};
declare class InstanceProvider implements CloudProvider {
    protected client: EC2Client;
    constructor(props: ProviderProps$8);
    own(id: string): boolean;
    get({ id }: GetProps<Document$5>): Promise<_aws_sdk_client_ec2.Instance | undefined>;
    create({ document }: CreateProps<Document$5>): Promise<string>;
    update({ id, newDocument }: UpdateProps<Document$5>): Promise<string>;
    delete({ id }: DeleteProps<Document$5>): Promise<void>;
    runInstance(document: Document$5): Promise<string>;
    terminateInstance(id: string, skipOnNotFound?: boolean): Promise<void>;
}

declare class InternetGateway extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props?: {
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

declare class KeyPair extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        type?: Input<'rsa' | 'ed25519'>;
        format?: Input<'pem' | 'ppk'>;
        publicKey?: Input<string>;
        tags?: Input<Record<string, Input<string>>>;
    });
    get id(): Output<string>;
    get fingerprint(): Output<string>;
    get name(): Output<string>;
    toState(): {
        document: {
            KeyName: Input<string>;
            KeyType: "rsa" | "ed25519";
            KeyFormat: "pem" | "ppk";
            PublicKeyMaterial: Input<string> | undefined;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type InstanceType = 't3.nano' | 't3.micro' | 't3.small' | 't3.medium' | 't3.large' | 't3.xlarge' | 't3.2xlarge' | 't4g.nano' | 't4g.micro' | 't4g.small' | 't4g.medium' | 't4g.large' | 't4g.xlarge' | 't4g.2xlarge' | 'g4ad.xlarge' | 'g4dn.xlarge';
type LaunchTemplateProps = {
    name: Input<string>;
    imageId: Input<string>;
    instanceType: Input<InstanceType>;
    ebsOptimized?: Input<boolean>;
    iamInstanceProfile?: Input<ARN>;
    monitoring?: Input<boolean>;
    securityGroupIds?: Input<Input<string>[]>;
    userData?: Input<Asset>;
};
declare class LaunchTemplate extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: LaunchTemplateProps);
    get name(): Output<string>;
    get id(): Output<string>;
    get defaultVersion(): Output<string>;
    get latestVersion(): Output<string>;
    get version(): Output<string>;
    toState(): {
        assets: {
            userData: Input<Asset> | undefined;
        };
        document: {
            LaunchTemplateName: Input<string>;
            LaunchTemplateData: {
                EbsOptimized: Input<boolean> | undefined;
                IamInstanceProfile: {
                    Arn: Input<`arn:${string}`> | undefined;
                };
                ImageId: Input<string>;
                InstanceType: Input<InstanceType>;
                Monitoring: {
                    Enabled: boolean;
                };
                SecurityGroupIds: Input<Input<string>[]> | undefined;
                UserData: {
                    __ASSET__: string;
                };
            };
        };
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

declare class Route extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
            DestinationCidrBlock: string;
            GatewayId: Input<string>;
            RouteTableId: Input<string>;
        } | {
            DestinationIpv6CidrBlock: string;
            GatewayId: Input<string>;
            RouteTableId: Input<string>;
        };
    };
}

declare class RouteTable extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type Rule$1 = {
    peer: Input<Peer>;
    port: Input<Port>;
    description?: Input<string>;
};
declare class SecurityGroup extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    private ingress;
    private egress;
    constructor(parent: Node, id: string, props: {
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

declare class SubnetRouteTableAssociation extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

declare class Subnet extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        vpcId: Input<string>;
        availabilityZone: Input<string>;
        cidrBlock?: Input<Peer>;
        ipv6CidrBlock?: Input<Peer>;
        ipv6Native?: Input<boolean>;
        assignIpv6AddressOnCreation?: Input<boolean>;
        mapPublicIpOnLaunch?: Input<boolean>;
    });
    get id(): Output<string>;
    get vpcId(): Output<string>;
    get availabilityZone(): Output<string>;
    get availabilityZoneId(): Output<string>;
    associateRouteTable(routeTableId: Input<string>): SubnetRouteTableAssociation;
    toState(): {
        document: {
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
            VpcId: Input<string>;
            AvailabilityZone: Input<string>;
            AssignIpv6AddressOnCreation: Input<boolean> | undefined;
        };
    };
}

declare class Vpc extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name: Input<string>;
        cidrBlock: Input<Peer>;
        enableDnsSupport?: Input<boolean>;
        enableDnsHostnames?: Input<boolean>;
    });
    get id(): Output<string>;
    get defaultNetworkAcl(): Output<string>;
    get defaultSecurityGroup(): Output<string>;
    toState(): {
        document: {
            CidrBlock: string;
            EnableDnsSupport: Input<boolean> | undefined;
            EnableDnsHostnames: Input<boolean> | undefined;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

declare class VPCCidrBlock extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        vpcId: Input<string>;
        cidrBlock?: Input<Peer>;
        amazonProvidedIpv6CidrBlock?: Input<boolean>;
    });
    get vpcId(): Output<string>;
    get id(): Output<string>;
    get ipv6CidrBlock(): Output<string>;
    toState(): {
        document: {
            AmazonProvidedIpv6CidrBlock: Input<boolean> | undefined;
            VpcId: Input<string>;
        };
    };
}

declare class VPCGatewayAttachment extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$n_Instance = Instance;
declare const index$n_Instance: typeof Instance;
type index$n_InstanceConnectEndpoint = InstanceConnectEndpoint;
declare const index$n_InstanceConnectEndpoint: typeof InstanceConnectEndpoint;
type index$n_InstanceProvider = InstanceProvider;
declare const index$n_InstanceProvider: typeof InstanceProvider;
type index$n_InstanceType = InstanceType;
type index$n_InternetGateway = InternetGateway;
declare const index$n_InternetGateway: typeof InternetGateway;
type index$n_KeyPair = KeyPair;
declare const index$n_KeyPair: typeof KeyPair;
type index$n_LaunchTemplate = LaunchTemplate;
declare const index$n_LaunchTemplate: typeof LaunchTemplate;
type index$n_LaunchTemplateProps = LaunchTemplateProps;
type index$n_Peer = Peer;
declare const index$n_Peer: typeof Peer;
type index$n_Port = Port;
declare const index$n_Port: typeof Port;
type index$n_PortProps = PortProps;
type index$n_Protocol = Protocol;
declare const index$n_Protocol: typeof Protocol;
type index$n_Route = Route;
declare const index$n_Route: typeof Route;
type index$n_RouteTable = RouteTable;
declare const index$n_RouteTable: typeof RouteTable;
type index$n_SecurityGroup = SecurityGroup;
declare const index$n_SecurityGroup: typeof SecurityGroup;
type index$n_Subnet = Subnet;
declare const index$n_Subnet: typeof Subnet;
type index$n_SubnetRouteTableAssociation = SubnetRouteTableAssociation;
declare const index$n_SubnetRouteTableAssociation: typeof SubnetRouteTableAssociation;
type index$n_VPCCidrBlock = VPCCidrBlock;
declare const index$n_VPCCidrBlock: typeof VPCCidrBlock;
type index$n_VPCGatewayAttachment = VPCGatewayAttachment;
declare const index$n_VPCGatewayAttachment: typeof VPCGatewayAttachment;
type index$n_Vpc = Vpc;
declare const index$n_Vpc: typeof Vpc;
declare namespace index$n {
  export {
    index$n_Instance as Instance,
    index$n_InstanceConnectEndpoint as InstanceConnectEndpoint,
    index$n_InstanceProvider as InstanceProvider,
    index$n_InstanceType as InstanceType,
    index$n_InternetGateway as InternetGateway,
    index$n_KeyPair as KeyPair,
    index$n_LaunchTemplate as LaunchTemplate,
    index$n_LaunchTemplateProps as LaunchTemplateProps,
    index$n_Peer as Peer,
    index$n_Port as Port,
    index$n_PortProps as PortProps,
    index$n_Protocol as Protocol,
    index$n_Route as Route,
    index$n_RouteTable as RouteTable,
    index$n_SecurityGroup as SecurityGroup,
    index$n_Subnet as Subnet,
    index$n_SubnetRouteTableAssociation as SubnetRouteTableAssociation,
    index$n_VPCCidrBlock as VPCCidrBlock,
    index$n_VPCGatewayAttachment as VPCGatewayAttachment,
    index$n_Vpc as Vpc,
  };
}

type ImageProps = {
    repository: Input<string>;
    hash: Input<Asset>;
    name: Input<string>;
    tag: Input<string>;
};
declare class Image extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: ImageProps);
    get uri(): Output<string>;
    toState(): {
        assets: {
            hash: Input<Asset>;
        };
        document: {
            RepositoryName: Input<string>;
            ImageName: Input<string>;
            Tag: Input<string>;
        };
    };
}

type ProviderProps$7 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    accountId: string;
    region: string;
};
type Document$4 = {
    RepositoryName: string;
    ImageName: string;
    Tag: string;
};
declare class ImageProvider implements CloudProvider {
    private props;
    protected client: ECRClient;
    private loggedIn;
    constructor(props: ProviderProps$7);
    own(id: string): boolean;
    private getCredentials;
    private login;
    private push;
    get({ document }: GetProps<Document$4>): Promise<{
        ImageUri: string;
    }>;
    create({ document }: CreateProps<Document$4>): Promise<string>;
    update({ oldDocument, newDocument }: UpdateProps<Document$4>): Promise<string>;
    delete({ document }: DeleteProps<Document$4>): Promise<void>;
}

type RepositoryProps = {
    name: Input<string>;
    emptyOnDelete?: Input<boolean>;
    imageTagMutability?: Input<boolean>;
};
declare class Repository extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: RepositoryProps);
    get name(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get uri(): Output<string>;
    toState(): {
        document: {
            RepositoryName: Input<string>;
            EmptyOnDelete: Input<boolean> | undefined;
            ImageTagMutability: string;
        };
    };
}

type index$m_Image = Image;
declare const index$m_Image: typeof Image;
type index$m_ImageProps = ImageProps;
type index$m_ImageProvider = ImageProvider;
declare const index$m_ImageProvider: typeof ImageProvider;
type index$m_Repository = Repository;
declare const index$m_Repository: typeof Repository;
type index$m_RepositoryProps = RepositoryProps;
declare namespace index$m {
  export {
    index$m_Image as Image,
    index$m_ImageProps as ImageProps,
    index$m_ImageProvider as ImageProvider,
    index$m_Repository as Repository,
    index$m_RepositoryProps as RepositoryProps,
  };
}

type ProviderProps$6 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    cloudProvider: CloudProvider;
};
type Document$3 = {
    FunctionName: string;
    Architectures: string[];
    Code: {
        S3Bucket: string;
        S3Key: string;
        S3ObjectVersion?: string;
    } | {
        ImageUri: string;
    } | {
        ZipFile: string;
    };
};
declare class FunctionProvider implements CloudProvider {
    private props;
    protected client: LambdaClient;
    constructor(props: ProviderProps$6);
    own(id: string): boolean;
    get(props: GetProps): Promise<any>;
    create(props: CreateProps): Promise<string>;
    update(props: UpdateProps<Document$3>): Promise<string>;
    delete(props: DeleteProps): Promise<void>;
    updateFunctionCode(props: UpdateProps<Document$3>): Promise<void>;
}

type ProviderProps$5 = {
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
    constructor(props: ProviderProps$5);
    own(id: string): boolean;
    get({ id, document }: GetProps<Document$2>): Promise<_aws_sdk_client_route_53.ResourceRecordSet | undefined>;
    private formatRecordSet;
    create({ document }: CreateProps<Document$2>): Promise<`${string}-${string}-${string}-${string}-${string}`>;
    update({ id, oldDocument, newDocument }: UpdateProps<Document$2>): Promise<string>;
    delete({ id, document }: DeleteProps<Document$2>): Promise<void>;
}

type ProviderProps$4 = {
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
    constructor(props: ProviderProps$4);
    own(id: string): boolean;
    get({ document }: GetProps<Document$1>): Promise<{
        VersionId: string | undefined;
        ETag: string | undefined;
        Checksum: _aws_sdk_client_s3.Checksum | undefined;
    }>;
    create({ document, assets }: CreateProps<Document$1>): Promise<string>;
    update({ oldDocument, newDocument, newAssets }: UpdateProps<Document$1>): Promise<string>;
    delete({ document }: DeleteProps<Document$1>): Promise<void>;
}

type ProviderProps$3 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    cloudProvider: CloudProvider;
};
declare class BucketProvider implements CloudProvider {
    protected client: S3Client;
    protected cloudProvider: CloudProvider;
    constructor(props: ProviderProps$3);
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

type ProviderProps$2 = {
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
    constructor(props: ProviderProps$2);
    own(id: string): boolean;
    get({ id }: GetProps<Document>): Promise<Record<string, string> | undefined>;
    create({ document }: CreateProps<Document>): Promise<string>;
    update({}: UpdateProps<Document>): Promise<string>;
    delete({ id }: DeleteProps<Document>): Promise<void>;
}

type ConfigProps = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    accountId: string;
    region: string;
    timeout?: Duration;
};
declare const createCloudProviders: (config: ConfigProps) => (CertificateProvider | CertificateValidationProvider | CloudControlApiProvider | IntegrationProvider | StageProvider | DataSourceProvider | GraphQLApiProvider | GraphQLSchemaProvider | InvalidateCacheProvider | LambdaTriggersProvider | TableItemProvider | InstanceProvider | ImageProvider | FunctionProvider | RecordSetProvider | BucketObjectProvider | BucketProvider | SubscriptionProvider)[];

declare class LogGroup extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$l_LogGroup = LogGroup;
declare const index$l_LogGroup: typeof LogGroup;
declare namespace index$l {
  export {
    index$l_LogGroup as LogGroup,
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: UserPoolClientProps);
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: UserPoolDomainProps);
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
        configurationSet?: Input<string>;
    }>;
};
declare class UserPool extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: UserPoolProps);
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

type LambaTriggersProps = {
    userPoolId: Input<string>;
    triggers: Input<{
        beforeToken?: Input<ARN>;
        beforeLogin?: Input<ARN>;
        afterLogin?: Input<ARN>;
        beforeRegister?: Input<ARN>;
        afterRegister?: Input<ARN>;
        userMigration?: Input<ARN>;
        customMessage?: Input<ARN>;
        defineChallange?: Input<ARN>;
        createChallange?: Input<ARN>;
        verifyChallange?: Input<ARN>;
    }>;
};
declare class LambdaTriggers extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: LambaTriggersProps);
    toState(): {
        document: {
            UserPoolId: Input<string>;
            LambdaConfig: {
                [x: string]: unknown;
            };
        };
    };
}

type index$k_LambaTriggersProps = LambaTriggersProps;
type index$k_LambdaTriggers = LambdaTriggers;
declare const index$k_LambdaTriggers: typeof LambdaTriggers;
type index$k_LambdaTriggersProvider = LambdaTriggersProvider;
declare const index$k_LambdaTriggersProvider: typeof LambdaTriggersProvider;
type index$k_UserPool = UserPool;
declare const index$k_UserPool: typeof UserPool;
type index$k_UserPoolClient = UserPoolClient;
declare const index$k_UserPoolClient: typeof UserPoolClient;
type index$k_UserPoolClientProps = UserPoolClientProps;
type index$k_UserPoolDomain = UserPoolDomain;
declare const index$k_UserPoolDomain: typeof UserPoolDomain;
type index$k_UserPoolDomainProps = UserPoolDomainProps;
type index$k_UserPoolProps = UserPoolProps;
declare namespace index$k {
  export {
    index$k_LambaTriggersProps as LambaTriggersProps,
    index$k_LambdaTriggers as LambdaTriggers,
    index$k_LambdaTriggersProvider as LambdaTriggersProvider,
    index$k_UserPool as UserPool,
    index$k_UserPoolClient as UserPoolClient,
    index$k_UserPoolClientProps as UserPoolClientProps,
    index$k_UserPoolDomain as UserPoolDomain,
    index$k_UserPoolDomainProps as UserPoolDomainProps,
    index$k_UserPoolProps as UserPoolProps,
  };
}

type ProviderProps$1 = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    tableName: string;
};
declare class LockProvider$2 implements LockProvider$3 {
    private props;
    protected client: DynamoDB;
    constructor(props: ProviderProps$1);
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

declare class InstanceProfile extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name?: Input<string>;
        path?: Input<string>;
        roles: Input<Input<string>[]>;
    });
    get arn(): Output<`arn:${string}`>;
    get name(): Output<string>;
    toState(): {
        document: {
            Roles: Input<Input<string>[]>;
        };
    };
}

declare const fromAwsManagedPolicyName: (name: string) => `arn:aws:iam::aws:policy/service-role/${string}`;

type Statement = {
    effect?: Input<'allow' | 'deny'>;
    actions: Input<Input<string>[]>;
    resources: Input<(Input<ARN> | Input<'*'>)[]>;
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
            Resource: Input<(Input<`arn:${string}`> | Input<"*">)[]>;
        }[];
    };
};
declare const formatStatement: (statement: Statement) => {
    Effect: string;
    Action: Input<Input<string>[]>;
    Resource: Input<(Input<`arn:${string}`> | Input<"*">)[]>;
};
declare class RolePolicy extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    private statements;
    constructor(parent: Node, id: string, props: {
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
                    Resource: Input<(Input<`arn:${string}`> | Input<"*">)[]>;
                }[];
            };
            RoleName: Input<string>;
        };
    };
}

declare class Role extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    private inlinePolicies;
    private managedPolicies;
    constructor(parent: Node, id: string, props?: {
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
                        Resource: Input<(Input<`arn:${string}`> | Input<"*">)[]>;
                    }[];
                };
            }[];
        };
    };
}

type index$j_InstanceProfile = InstanceProfile;
declare const index$j_InstanceProfile: typeof InstanceProfile;
type index$j_PolicyDocument = PolicyDocument;
type index$j_PolicyDocumentVersion = PolicyDocumentVersion;
type index$j_Role = Role;
declare const index$j_Role: typeof Role;
type index$j_RolePolicy = RolePolicy;
declare const index$j_RolePolicy: typeof RolePolicy;
type index$j_Statement = Statement;
declare const index$j_formatPolicyDocument: typeof formatPolicyDocument;
declare const index$j_formatStatement: typeof formatStatement;
declare const index$j_fromAwsManagedPolicyName: typeof fromAwsManagedPolicyName;
declare namespace index$j {
  export {
    index$j_InstanceProfile as InstanceProfile,
    index$j_PolicyDocument as PolicyDocument,
    index$j_PolicyDocumentVersion as PolicyDocumentVersion,
    index$j_Role as Role,
    index$j_RolePolicy as RolePolicy,
    index$j_Statement as Statement,
    index$j_formatPolicyDocument as formatPolicyDocument,
    index$j_formatStatement as formatStatement,
    index$j_fromAwsManagedPolicyName as fromAwsManagedPolicyName,
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
    readonly parent: Node;
    private props;
    private indexes;
    constructor(parent: Node, id: string, props: TableProps);
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: {
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

type index$i_IndexProps = IndexProps;
type index$i_StreamViewType = StreamViewType;
type index$i_Table = Table;
declare const index$i_Table: typeof Table;
type index$i_TableItem = TableItem;
declare const index$i_TableItem: typeof TableItem;
type index$i_TableItemProvider = TableItemProvider;
declare const index$i_TableItemProvider: typeof TableItemProvider;
type index$i_TableProps = TableProps;
declare namespace index$i {
  export {
    index$i_IndexProps as IndexProps,
    LockProvider$2 as LockProvider,
    index$i_StreamViewType as StreamViewType,
    index$i_Table as Table,
    index$i_TableItem as TableItem,
    index$i_TableItemProvider as TableItemProvider,
    index$i_TableProps as TableProps,
  };
}

type ClusterProps = {
    name: Input<string>;
    containerInsights?: Input<boolean>;
    log?: {
        provider: 'cloudwatch';
        groupName: Input<string>;
    } | {
        provider: 's3';
        bucketName: Input<string>;
        keyPrefix?: Input<string>;
    };
};
declare class Cluster$1 extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: ClusterProps);
    get name(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            ClusterName: Input<string>;
            ClusterSettings: {
                Name: string;
                Value: string;
            }[];
            Configuration: {
                ExecuteCommandConfiguration: {
                    Logging: string;
                    LogConfiguration: {
                        CloudWatchLogGroupName: Input<string>;
                        S3BucketName?: undefined;
                        S3KeyPrefix?: undefined;
                    } | {
                        S3BucketName: Input<string>;
                        S3KeyPrefix: Input<string> | undefined;
                        CloudWatchLogGroupName?: undefined;
                    };
                } | {
                    Logging: string;
                    LogConfiguration?: undefined;
                };
            };
        };
    };
}

type ServiceProps = {
    name: Input<string>;
    containerInsights?: Input<boolean>;
    log?: {
        provider: 'cloudwatch';
        groupName: Input<string>;
    } | {
        provider: 's3';
        bucketName: Input<string>;
        keyPrefix?: Input<string>;
    };
};
declare class Service extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: ServiceProps);
    get name(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    toState(): {
        document: {
            ClusterName: Input<string>;
            ClusterSettings: {
                Name: string;
                Value: string;
            }[];
            Configuration: {
                ExecuteCommandConfiguration: {
                    Logging: string;
                    LogConfiguration: {
                        CloudWatchLogGroupName: Input<string>;
                        S3BucketName?: undefined;
                        S3KeyPrefix?: undefined;
                    } | {
                        S3BucketName: Input<string>;
                        S3KeyPrefix: Input<string> | undefined;
                        CloudWatchLogGroupName?: undefined;
                    };
                } | {
                    Logging: string;
                    LogConfiguration?: undefined;
                };
            };
        };
    };
}

type index$h_ClusterProps = ClusterProps;
type index$h_Service = Service;
declare const index$h_Service: typeof Service;
type index$h_ServiceProps = ServiceProps;
declare namespace index$h {
  export {
    Cluster$1 as Cluster,
    index$h_ClusterProps as ClusterProps,
    index$h_Service as Service,
    index$h_ServiceProps as ServiceProps,
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$g_AuthCognitoAction = AuthCognitoAction;
declare const index$g_AuthCognitoAction: typeof AuthCognitoAction;
type index$g_AuthenticateCognitoProps = AuthenticateCognitoProps;
type index$g_ContentType = ContentType;
type index$g_FixedResponseAction = FixedResponseAction;
declare const index$g_FixedResponseAction: typeof FixedResponseAction;
type index$g_FixedResponseProps = FixedResponseProps;
type index$g_ForwardAction = ForwardAction;
declare const index$g_ForwardAction: typeof ForwardAction;
type index$g_ForwardProps = ForwardProps;
type index$g_HttpRequestMethod = HttpRequestMethod;
type index$g_HttpRequestMethods = HttpRequestMethods;
declare const index$g_HttpRequestMethods: typeof HttpRequestMethods;
type index$g_HttpRequestMethodsProps = HttpRequestMethodsProps;
type index$g_Listener = Listener;
declare const index$g_Listener: typeof Listener;
type index$g_ListenerAction = ListenerAction;
declare const index$g_ListenerAction: typeof ListenerAction;
type index$g_ListenerCondition = ListenerCondition;
declare const index$g_ListenerCondition: typeof ListenerCondition;
type index$g_ListenerRule = ListenerRule;
declare const index$g_ListenerRule: typeof ListenerRule;
type index$g_LoadBalancer = LoadBalancer;
declare const index$g_LoadBalancer: typeof LoadBalancer;
type index$g_PathPattern = PathPattern;
declare const index$g_PathPattern: typeof PathPattern;
type index$g_PathPatternProps = PathPatternProps;
type index$g_TargetGroup = TargetGroup;
declare const index$g_TargetGroup: typeof TargetGroup;
declare namespace index$g {
  export {
    index$g_AuthCognitoAction as AuthCognitoAction,
    index$g_AuthenticateCognitoProps as AuthenticateCognitoProps,
    index$g_ContentType as ContentType,
    index$g_FixedResponseAction as FixedResponseAction,
    index$g_FixedResponseProps as FixedResponseProps,
    index$g_ForwardAction as ForwardAction,
    index$g_ForwardProps as ForwardProps,
    index$g_HttpRequestMethod as HttpRequestMethod,
    index$g_HttpRequestMethods as HttpRequestMethods,
    index$g_HttpRequestMethodsProps as HttpRequestMethodsProps,
    index$g_Listener as Listener,
    index$g_ListenerAction as ListenerAction,
    index$g_ListenerCondition as ListenerCondition,
    index$g_ListenerRule as ListenerRule,
    index$g_LoadBalancer as LoadBalancer,
    index$g_PathPattern as PathPattern,
    index$g_PathPatternProps as PathPatternProps,
    index$g_TargetGroup as TargetGroup,
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: RuleProps);
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

type index$f_Rule = Rule;
declare const index$f_Rule: typeof Rule;
type index$f_RuleProps = RuleProps;
type index$f_RuleTarget = RuleTarget;
declare namespace index$f {
  export {
    index$f_Rule as Rule,
    index$f_RuleProps as RuleProps,
    index$f_RuleTarget as RuleTarget,
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: TopicRuleProps);
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

type index$e_TopicRule = TopicRule;
declare const index$e_TopicRule: typeof TopicRule;
type index$e_TopicRuleProps = TopicRuleProps;
type index$e_TopicRuleSqlVersion = TopicRuleSqlVersion;
declare namespace index$e {
  export {
    index$e_TopicRule as TopicRule,
    index$e_TopicRuleProps as TopicRuleProps,
    index$e_TopicRuleSqlVersion as TopicRuleSqlVersion,
  };
}

type ChannelProps = {
    name: Input<string>;
    type?: Input<'standard' | 'basic' | 'advanced-sd' | 'advanced-hd'>;
    preset?: Input<'higher' | 'constrained'>;
    latencyMode?: Input<'normal' | 'low'>;
    authorized?: Input<boolean>;
    insecureIngest?: Input<boolean>;
    tags?: Input<Record<string, Input<string>>>;
};
declare class Channel extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: ChannelProps);
    get arn(): Output<`arn:${string}`>;
    get ingestEndpoint(): Output<string>;
    get playbackUrl(): Output<string>;
    toState(): {
        document: {
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
            Name: Input<string>;
            Type: string;
            LatencyMode: string;
        };
    };
}

type StreamKeyProps = {
    channel: Input<ARN>;
    tags?: Input<Record<string, Input<string>>>;
};
declare class StreamKey extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: StreamKeyProps);
    get arn(): Output<`arn:${string}`>;
    get value(): Output<string>;
    toState(): {
        document: {
            ChannelArn: Input<`arn:${string}`>;
            Tags: {
                Key: string;
                Value: Input<string>;
            }[];
        };
    };
}

type index$d_Channel = Channel;
declare const index$d_Channel: typeof Channel;
type index$d_ChannelProps = ChannelProps;
type index$d_StreamKey = StreamKey;
declare const index$d_StreamKey: typeof StreamKey;
type index$d_StreamKeyProps = StreamKeyProps;
declare namespace index$d {
  export {
    index$d_Channel as Channel,
    index$d_ChannelProps as ChannelProps,
    index$d_StreamKey as StreamKey,
    index$d_StreamKeyProps as StreamKeyProps,
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

type EventInvokeConfigProps = {
    functionArn: Input<ARN>;
    maxEventAge?: Input<Duration>;
    onFailure?: Input<ARN>;
    onSuccess?: Input<ARN>;
    qualifier?: Input<string>;
    retryAttempts?: Input<number>;
};
declare class EventInvokeConfig extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: EventInvokeConfigProps);
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: EventSourceMappingProps);
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

type FunctionProps = {
    name: Input<string>;
    code: Input<Code>;
    sourceCodeHash?: Input<Asset>;
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
declare class Function extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    private environmentVariables;
    constructor(parent: Node, id: string, props: FunctionProps);
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
            sourceCodeHash: Input<Asset> | undefined;
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
            PackageType: string;
            FunctionName: Input<string>;
            Description: Input<string> | undefined;
            MemorySize: bigint;
            Timeout: bigint;
            Architectures: ("arm64" | "x86_64")[];
            Role: Input<`arn:${string}`>;
        } | {
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
            Runtime: "nodejs18.x" | "nodejs20.x";
            Handler: string;
            FunctionName: Input<string>;
            Description: Input<string> | undefined;
            MemorySize: bigint;
            Timeout: bigint;
            Architectures: ("arm64" | "x86_64")[];
            Role: Input<`arn:${string}`>;
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: PermissionProps);
    toState(): {
        document: {
            FunctionName: Input<`arn:${string}`>;
            Action: string;
            Principal: Input<string>;
        };
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: UrlProps);
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

type index$c_Code = Code;
type index$c_EventInvokeConfig = EventInvokeConfig;
declare const index$c_EventInvokeConfig: typeof EventInvokeConfig;
type index$c_EventInvokeConfigProps = EventInvokeConfigProps;
type index$c_EventSourceMapping = EventSourceMapping;
declare const index$c_EventSourceMapping: typeof EventSourceMapping;
type index$c_EventSourceMappingProps = EventSourceMappingProps;
type index$c_Function = Function;
declare const index$c_Function: typeof Function;
type index$c_FunctionProps = FunctionProps;
type index$c_FunctionProvider = FunctionProvider;
declare const index$c_FunctionProvider: typeof FunctionProvider;
type index$c_Permission = Permission;
declare const index$c_Permission: typeof Permission;
type index$c_PermissionProps = PermissionProps;
type index$c_StartingPosition = StartingPosition;
type index$c_Url = Url;
declare const index$c_Url: typeof Url;
type index$c_UrlProps = UrlProps;
declare const index$c_formatCode: typeof formatCode;
declare namespace index$c {
  export {
    index$c_Code as Code,
    index$c_EventInvokeConfig as EventInvokeConfig,
    index$c_EventInvokeConfigProps as EventInvokeConfigProps,
    index$c_EventSourceMapping as EventSourceMapping,
    index$c_EventSourceMappingProps as EventSourceMappingProps,
    index$c_Function as Function,
    index$c_FunctionProps as FunctionProps,
    index$c_FunctionProvider as FunctionProvider,
    index$c_Permission as Permission,
    index$c_PermissionProps as PermissionProps,
    index$c_StartingPosition as StartingPosition,
    index$c_Url as Url,
    index$c_UrlProps as UrlProps,
    index$c_formatCode as formatCode,
  };
}

type NodeType$1 = 't4g.small' | 't4g.medium' | 'r6g.large' | 'r6g.xlarge' | 'r6g.2xlarge' | 'r6g.4xlarge' | 'r6g.8xlarge' | 'r6g.12xlarge' | 'r6g.16xlarge' | 'r6gd.xlarge' | 'r6gd.2xlarge' | 'r6gd.4xlarge' | 'r6gd.8xlarge';
declare class Cluster extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        aclName: Input<string>;
        subnetGroupName?: Input<string>;
        securityGroupIds?: Input<Input<string>[]>;
        name: Input<string>;
        description?: Input<string>;
        port?: Input<number>;
        engine?: Input<'6.2' | '7.0'>;
        type: Input<NodeType$1>;
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        subnetIds: Input<Input<string>[]>;
        name: Input<string>;
        description?: Input<string | undefined>;
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

type index$b_Cluster = Cluster;
declare const index$b_Cluster: typeof Cluster;
type index$b_SubnetGroup = SubnetGroup;
declare const index$b_SubnetGroup: typeof SubnetGroup;
declare namespace index$b {
  export {
    index$b_Cluster as Cluster,
    NodeType$1 as NodeType,
    index$b_SubnetGroup as SubnetGroup,
  };
}

type Version = '2.13' | '2.11' | '2.9' | '2.7' | '2.5' | '2.3' | '1.3';
type NodeType = 't3.small' | 't3.medium' | 't3.large' | 't3.xlarge' | 't3.2xlarge' | 't4g.small' | 't4g.medium' | 'm3.medium' | 'm3.large' | 'm3.xlarge' | 'm3.2xlarge' | 'm4.large' | 'm4.xlarge' | 'm4.2xlarge' | 'm4.4xlarge' | 'm4.10xlarge' | 'm5.large' | 'm5.xlarge' | 'm5.2xlarge' | 'm5.4xlarge' | 'm5.12xlarge' | 'm5.24xlarge' | 'r5.large' | 'r5.xlarge' | 'r5.2xlarge' | 'r5.4xlarge' | 'r5.12xlarge' | 'r5.24xlarge' | 'c5.large' | 'c5.xlarge' | 'c5.2xlarge' | 'c5.4xlarge' | 'c5.9xlarge' | 'c5.18xlarge' | 'or1.medium' | 'or1.large' | 'or1.xlarge' | 'or1.2xlarge' | 'or1.4xlarge' | 'or1.8xlarge' | 'or1.12xlarge' | 'or1.16xlarge' | 'ultrawarm1.medium' | 'ultrawarm1.large' | 'ultrawarm1.xlarge' | 'r3.large' | 'r3.xlarge' | 'r3.2xlarge' | 'r3.4xlarge' | 'r3.8xlarge' | 'i2.xlarge' | 'i2.2xlarge' | 'd2.xlarge' | 'd2.2xlarge' | 'd2.4xlarge' | 'd2.8xlarge' | 'c4.large' | 'c4.xlarge' | 'c4.2xlarge' | 'c4.4xlarge' | 'c4.8xlarge' | 'r4.large' | 'r4.xlarge' | 'r4.2xlarge' | 'r4.4xlarge' | 'r4.8xlarge' | 'r4.16xlarge' | 'i3.large' | 'i3.xlarge' | 'i3.2xlarge' | 'i3.4xlarge' | 'i3.8xlarge' | 'i3.16xlarge' | 'r6g.large' | 'r6g.xlarge' | 'r6g.2xlarge' | 'r6g.4xlarge' | 'r6g.8xlarge' | 'r6g.12xlarge' | 'm6g.large' | 'm6g.xlarge' | 'm6g.2xlarge' | 'm6g.4xlarge' | 'm6g.8xlarge' | 'm6g.12xlarge' | 'c6g.large' | 'c6g.xlarge' | 'c6g.2xlarge' | 'c6g.4xlarge' | 'c6g.8xlarge' | 'c6g.12xlarge' | 'r6gd.large' | 'r6gd.xlarge' | 'r6gd.2xlarge' | 'r6gd.4xlarge' | 'r6gd.8xlarge' | 'r6gd.12xlarge' | 'r6gd.16xlarge';
declare class Domain extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
        name?: Input<string>;
        instance: Input<{
            type: Input<NodeType>;
            count: Input<number>;
        }>;
        version?: Input<Version>;
        storageSize?: Input<Size>;
        ipType?: Input<'ipv4' | 'dualstack'>;
        encryption?: Input<boolean>;
        vpc?: Input<{
            securityGroupIds: Input<Input<string>[]>;
            subnetIds: Input<Input<string>[]>;
        }>;
        accessPolicy?: {
            version?: Input<'2012-10-17'>;
            statements: Input<Input<{
                effect?: Input<'allow' | 'deny'>;
                principal?: Input<string>;
                actions?: Input<Input<string>[]>;
                resources?: Input<Input<string>[]>;
                sourceArn?: Input<ARN>;
            }>[]>;
        };
    });
    get id(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get domainArn(): Output<`arn:${string}`>;
    get domainEndpoint(): Output<string>;
    setVpc(vpc: Input<{
        securityGroupIds: Input<Input<string>[]>;
        subnetIds: Input<Input<string>[]>;
    }>): this;
    toState(): {
        document: {
            AccessPolicies: {
                Version: "2012-10-17";
                Statement: {
                    Condition?: {
                        StringEquals: {
                            'AWS:SourceArn': Input<`arn:${string}`>;
                        };
                    } | undefined;
                    Principal?: {
                        Service: Input<string>;
                    } | undefined;
                    Effect: string;
                    Action: Input<string>[];
                    Resource: Input<string>[];
                }[];
            };
            VPCOptions?: {
                SecurityGroupIds: Input<Input<string>[]>;
                SubnetIds: Input<Input<string>[]>;
            } | undefined;
            DomainName: Input<string> | undefined;
            EngineVersion: string;
            IPAddressType: "ipv4" | "dualstack";
            ClusterConfig: {
                InstanceType: string;
                InstanceCount: Input<number>;
            };
            EBSOptions: {
                EBSEnabled: boolean;
                VolumeSize: bigint;
                VolumeType: string;
            };
            DomainEndpointOptions: {
                EnforceHTTPS: boolean;
            };
            SoftwareUpdateOptions: {
                AutoSoftwareUpdateEnabled: boolean;
            };
            NodeToNodeEncryptionOptions: {
                Enabled: boolean;
            };
            EncryptionAtRestOptions: {
                Enabled: boolean;
            };
        };
    };
}

type index$a_Domain = Domain;
declare const index$a_Domain: typeof Domain;
type index$a_NodeType = NodeType;
type index$a_Version = Version;
declare namespace index$a {
  export {
    index$a_Domain as Domain,
    index$a_NodeType as NodeType,
    index$a_Version as Version,
  };
}

declare class Collection extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$9_Collection = Collection;
declare const index$9_Collection: typeof Collection;
type index$9_SecurityPolicy = SecurityPolicy;
declare const index$9_SecurityPolicy: typeof SecurityPolicy;
declare namespace index$9 {
  export {
    index$9_Collection as Collection,
    index$9_SecurityPolicy as SecurityPolicy,
  };
}

type HostedZoneProps = {
    name: Input<string>;
};
declare class HostedZone extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: HostedZoneProps);
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

type index$8_HostedZone = HostedZone;
declare const index$8_HostedZone: typeof HostedZone;
type index$8_HostedZoneProps = HostedZoneProps;
type index$8_RecordSet = RecordSet;
declare const index$8_RecordSet: typeof RecordSet;
type index$8_RecordSetProps = RecordSetProps;
type index$8_RecordSetProvider = RecordSetProvider;
declare const index$8_RecordSetProvider: typeof RecordSetProvider;
type index$8_RecordType = RecordType;
declare const index$8_formatRecordSet: typeof formatRecordSet;
declare namespace index$8 {
  export {
    index$8_HostedZone as HostedZone,
    index$8_HostedZoneProps as HostedZoneProps,
    Record$1 as Record,
    index$8_RecordSet as RecordSet,
    index$8_RecordSetProps as RecordSetProps,
    index$8_RecordSetProvider as RecordSetProvider,
    index$8_RecordType as RecordType,
    index$8_formatRecordSet as formatRecordSet,
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
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: BucketObjectProps);
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

type NotifictionEvent = 's3:TestEvent' | 's3:ObjectCreated:*' | 's3:ObjectCreated:Put' | 's3:ObjectCreated:Post' | 's3:ObjectCreated:Copy' | 's3:ObjectCreated:CompleteMultipartUpload' | 's3:ObjectRemoved:*' | 's3:ObjectRemoved:Delete' | 's3:ObjectRemoved:DeleteMarkerCreated' | 's3:ObjectRestore:*' | 's3:ObjectRestore:Post' | 's3:ObjectRestore:Completed' | 's3:ObjectRestore:Delete' | 's3:ReducedRedundancyLostObject' | 's3:Replication:*' | 's3:Replication:OperationFailedReplication' | 's3:Replication:OperationMissedThreshold' | 's3:Replication:OperationReplicatedAfterThreshold' | 's3:Replication:OperationNotTracked' | 's3:LifecycleExpiration:*' | 's3:LifecycleExpiration:Delete' | 's3:LifecycleExpiration:DeleteMarkerCreated' | 's3:LifecycleTransition' | 's3:IntelligentTiering' | 's3:ObjectTagging:*' | 's3:ObjectTagging:Put' | 's3:ObjectTagging:Delete' | 's3:ObjectAcl:Put';
type BucketProps = {
    name?: Input<string>;
    versioning?: Input<boolean>;
    forceDelete?: Input<boolean>;
    website?: Input<{
        indexDocument?: Input<string>;
        errorDocument?: Input<string>;
    }>;
    lambdaConfigs?: Input<Input<{
        event: Input<NotifictionEvent>;
        function: Input<ARN>;
    }>[]>;
    cors?: Input<Input<{
        maxAge?: Input<Duration>;
        origins: Input<Input<string>[]>;
        methods: Input<Array<Input<'GET' | 'PUT' | 'HEAD' | 'POST' | 'DELETE'>>>;
        headers?: Input<Input<string>[]>;
        exposeHeaders?: Input<Input<string>[]>;
    }>[]>;
};
declare class Bucket extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props?: BucketProps);
    get name(): Output<string>;
    get arn(): Output<`arn:${string}`>;
    get domainName(): Output<string>;
    get dualStackDomainName(): Output<string>;
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
            NotificationConfiguration?: {
                LambdaConfigurations: {
                    Event: Input<NotifictionEvent>;
                    Function: `arn:${string}`;
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

declare class BucketPolicy extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type ProviderProps = {
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    region: string;
    bucket: string;
};
declare class StateProvider$2 implements StateProvider$3 {
    private props;
    protected client: S3Client;
    constructor(props: ProviderProps);
    get(urn: URN): Promise<any>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type index$7_Bucket = Bucket;
declare const index$7_Bucket: typeof Bucket;
type index$7_BucketObject = BucketObject;
declare const index$7_BucketObject: typeof BucketObject;
type index$7_BucketObjectProps = BucketObjectProps;
type index$7_BucketObjectProvider = BucketObjectProvider;
declare const index$7_BucketObjectProvider: typeof BucketObjectProvider;
type index$7_BucketPolicy = BucketPolicy;
declare const index$7_BucketPolicy: typeof BucketPolicy;
type index$7_BucketProps = BucketProps;
type index$7_BucketProvider = BucketProvider;
declare const index$7_BucketProvider: typeof BucketProvider;
type index$7_NotifictionEvent = NotifictionEvent;
declare namespace index$7 {
  export {
    index$7_Bucket as Bucket,
    index$7_BucketObject as BucketObject,
    index$7_BucketObjectProps as BucketObjectProps,
    index$7_BucketObjectProvider as BucketObjectProvider,
    index$7_BucketPolicy as BucketPolicy,
    index$7_BucketProps as BucketProps,
    index$7_BucketProvider as BucketProvider,
    index$7_NotifictionEvent as NotifictionEvent,
    StateProvider$2 as StateProvider,
  };
}

declare class EmailIdentity extends CloudControlApiResource {
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: {
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

type index$6_ConfigurationSet = ConfigurationSet;
declare const index$6_ConfigurationSet: typeof ConfigurationSet;
type index$6_EmailIdentity = EmailIdentity;
declare const index$6_EmailIdentity: typeof EmailIdentity;
declare namespace index$6 {
  export {
    index$6_ConfigurationSet as ConfigurationSet,
    index$6_EmailIdentity as EmailIdentity,
  };
}

type SubscriptionProps = {
    topicArn: Input<ARN>;
    protocol: Input<'lambda' | 'email'>;
    endpoint: Input<string> | Input<ARN>;
};
declare class Subscription extends Resource {
    readonly parent: Node;
    private props;
    cloudProviderId: string;
    constructor(parent: Node, id: string, props: SubscriptionProps);
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: TopicProps);
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

type index$5_Subscription = Subscription;
declare const index$5_Subscription: typeof Subscription;
type index$5_SubscriptionProps = SubscriptionProps;
type index$5_SubscriptionProvider = SubscriptionProvider;
declare const index$5_SubscriptionProvider: typeof SubscriptionProvider;
type index$5_Topic = Topic;
declare const index$5_Topic: typeof Topic;
type index$5_TopicProps = TopicProps;
declare namespace index$5 {
  export {
    index$5_Subscription as Subscription,
    index$5_SubscriptionProps as SubscriptionProps,
    index$5_SubscriptionProvider as SubscriptionProvider,
    index$5_Topic as Topic,
    index$5_TopicProps as TopicProps,
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
    readonly parent: Node;
    private props;
    constructor(parent: Node, id: string, props: QueueProps);
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

type index$4_Queue = Queue;
declare const index$4_Queue: typeof Queue;
type index$4_QueueProps = QueueProps;
declare namespace index$4 {
  export {
    index$4_Queue as Queue,
    index$4_QueueProps as QueueProps,
  };
}

type index$3_ARN = ARN;
declare const index$3_createCloudProviders: typeof createCloudProviders;
declare namespace index$3 {
  export {
    index$3_ARN as ARN,
    index$t as acm,
    index$r as apiGatewayV2,
    index$q as appsync,
    index$p as autoScaling,
    index$s as cloudControlApi,
    index$o as cloudFront,
    index$l as cloudWatch,
    index$k as cognito,
    index$3_createCloudProviders as createCloudProviders,
    index$i as dynamodb,
    index$n as ec2,
    index$m as ecr,
    index$h as ecs,
    index$g as elb,
    index$f as events,
    index$j as iam,
    index$e as iot,
    index$d as ivs,
    index$c as lambda,
    index$b as memorydb,
    index$a as openSearch,
    index$9 as openSearchServerless,
    index$8 as route53,
    index$7 as s3,
    index$6 as ses,
    index$5 as sns,
    index$4 as sqs,
  };
}

declare class LockProvider$1 implements LockProvider$3 {
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

declare class StateProvider$1 implements StateProvider$3 {
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

declare namespace index$2 {
  export {
    LockProvider$1 as LockProvider,
    StateProvider$1 as StateProvider,
  };
}

declare class LockProvider implements LockProvider$3 {
    protected locks: Map<`urn:${string}`, number>;
    insecureReleaseLock(urn: URN): Promise<void>;
    locked(urn: URN): Promise<boolean>;
    lock(urn: URN): Promise<() => Promise<void>>;
}

declare class StateProvider implements StateProvider$3 {
    protected states: Map<`urn:${string}`, AppState>;
    get(urn: URN): Promise<AppState | undefined>;
    update(urn: URN, state: AppState): Promise<void>;
    delete(urn: URN): Promise<void>;
}

type index$1_LockProvider = LockProvider;
declare const index$1_LockProvider: typeof LockProvider;
type index$1_StateProvider = StateProvider;
declare const index$1_StateProvider: typeof StateProvider;
declare namespace index$1 {
  export {
    index$1_LockProvider as LockProvider,
    index$1_StateProvider as StateProvider,
  };
}

declare namespace index {
  export {
    index$2 as file,
    index$1 as memory,
  };
}

export { App, AppError, AppState, Asset, CloudProvider, CreateProps, DeleteProps, FileAsset, GetProps, Input, LockProvider$3 as LockProvider, Node, Output, RemoteAsset, ResolvedAsset, Resource, ResourceAlreadyExists, ResourceDeletionPolicy, ResourceDocument, ResourceError, ResourceExtra, ResourceNotFound, ResourceOperation, ResourcePolicies, ResourceState, Stack, StackError, StackOperation, StackState, StateProvider$3 as StateProvider, StringAsset, URN, Unwrap, UnwrapArray, UpdateProps, WorkSpace, index$3 as aws, combine, findResources, flatten, index as local, unwrap };
