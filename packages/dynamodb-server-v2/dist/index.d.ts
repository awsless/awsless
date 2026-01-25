import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type AttributeValue = {
    S: string;
} | {
    N: string;
} | {
    B: string;
} | {
    SS: string[];
} | {
    NS: string[];
} | {
    BS: string[];
} | {
    M: AttributeMap;
} | {
    L: AttributeValue[];
} | {
    NULL: true;
} | {
    BOOL: boolean;
};
type AttributeMap = Record<string, AttributeValue>;
interface KeySchemaElement {
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
}
interface AttributeDefinition {
    AttributeName: string;
    AttributeType: 'S' | 'N' | 'B';
}
interface Projection {
    ProjectionType?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    NonKeyAttributes?: string[];
}
interface ProvisionedThroughput {
    ReadCapacityUnits: number;
    WriteCapacityUnits: number;
}
interface GlobalSecondaryIndex {
    IndexName: string;
    KeySchema: KeySchemaElement[];
    Projection: Projection;
    ProvisionedThroughput?: ProvisionedThroughput;
}
interface LocalSecondaryIndex {
    IndexName: string;
    KeySchema: KeySchemaElement[];
    Projection: Projection;
}
type StreamViewType = 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
interface StreamSpecification {
    StreamEnabled: boolean;
    StreamViewType?: StreamViewType;
}
interface TimeToLiveSpecification {
    AttributeName: string;
    Enabled: boolean;
}
interface TableDescription {
    TableName: string;
    TableStatus: 'CREATING' | 'ACTIVE' | 'DELETING' | 'UPDATING';
    CreationDateTime: number;
    TableArn: string;
    TableId: string;
    KeySchema: KeySchemaElement[];
    AttributeDefinitions: AttributeDefinition[];
    ProvisionedThroughput?: {
        ReadCapacityUnits: number;
        WriteCapacityUnits: number;
        LastIncreaseDateTime?: number;
        LastDecreaseDateTime?: number;
        NumberOfDecreasesToday?: number;
    };
    BillingModeSummary?: {
        BillingMode: 'PROVISIONED' | 'PAY_PER_REQUEST';
        LastUpdateToPayPerRequestDateTime?: number;
    };
    GlobalSecondaryIndexes?: GlobalSecondaryIndexDescription[];
    LocalSecondaryIndexes?: LocalSecondaryIndexDescription[];
    StreamSpecification?: StreamSpecification;
    LatestStreamArn?: string;
    LatestStreamLabel?: string;
    ItemCount: number;
    TableSizeBytes: number;
}
interface GlobalSecondaryIndexDescription {
    IndexName: string;
    KeySchema: KeySchemaElement[];
    Projection: Projection;
    IndexStatus: 'CREATING' | 'ACTIVE' | 'DELETING' | 'UPDATING';
    ProvisionedThroughput?: ProvisionedThroughput;
    IndexSizeBytes: number;
    ItemCount: number;
    IndexArn: string;
}
interface LocalSecondaryIndexDescription {
    IndexName: string;
    KeySchema: KeySchemaElement[];
    Projection: Projection;
    IndexSizeBytes: number;
    ItemCount: number;
    IndexArn: string;
}
interface StreamRecord {
    eventID: string;
    eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    dynamodb: {
        ApproximateCreationDateTime: number;
        Keys: AttributeMap;
        NewImage?: AttributeMap;
        OldImage?: AttributeMap;
        SequenceNumber: string;
        SizeBytes: number;
        StreamViewType: StreamViewType;
    };
}
type StreamCallback = (record: StreamRecord) => void;
interface ConsumedCapacity {
    TableName: string;
    CapacityUnits: number;
    ReadCapacityUnits?: number;
    WriteCapacityUnits?: number;
    Table?: {
        CapacityUnits: number;
        ReadCapacityUnits?: number;
        WriteCapacityUnits?: number;
    };
    GlobalSecondaryIndexes?: Record<string, {
        CapacityUnits: number;
        ReadCapacityUnits?: number;
        WriteCapacityUnits?: number;
    }>;
    LocalSecondaryIndexes?: Record<string, {
        CapacityUnits: number;
        ReadCapacityUnits?: number;
        WriteCapacityUnits?: number;
    }>;
}

declare class Table {
    readonly name: string;
    readonly keySchema: KeySchemaElement[];
    readonly attributeDefinitions: AttributeDefinition[];
    readonly provisionedThroughput?: ProvisionedThroughput;
    readonly billingMode: 'PROVISIONED' | 'PAY_PER_REQUEST';
    readonly createdAt: number;
    readonly tableId: string;
    readonly streamSpecification?: StreamSpecification;
    readonly latestStreamArn?: string;
    readonly latestStreamLabel?: string;
    private ttlSpecification?;
    private items;
    private globalSecondaryIndexes;
    private localSecondaryIndexes;
    private streamCallbacks;
    private region;
    constructor(options: {
        tableName: string;
        keySchema: KeySchemaElement[];
        attributeDefinitions: AttributeDefinition[];
        provisionedThroughput?: ProvisionedThroughput;
        billingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
        globalSecondaryIndexes?: GlobalSecondaryIndex[];
        localSecondaryIndexes?: LocalSecondaryIndex[];
        streamSpecification?: StreamSpecification;
        timeToLiveSpecification?: TimeToLiveSpecification;
    }, region?: string);
    getHashKeyName(): string;
    getRangeKeyName(): string | undefined;
    getTtlAttributeName(): string | undefined;
    setTtlSpecification(spec: TimeToLiveSpecification): void;
    getTtlSpecification(): TimeToLiveSpecification | undefined;
    describe(): TableDescription;
    private describeGlobalSecondaryIndexes;
    private describeLocalSecondaryIndexes;
    private estimateTableSize;
    getItem(key: AttributeMap): AttributeMap | undefined;
    putItem(item: AttributeMap): AttributeMap | undefined;
    deleteItem(key: AttributeMap): AttributeMap | undefined;
    updateItem(key: AttributeMap, updatedItem: AttributeMap): AttributeMap | undefined;
    private updateIndexes;
    private addToIndexes;
    private removeFromIndexes;
    private buildIndexKey;
    scan(limit?: number, exclusiveStartKey?: AttributeMap): {
        items: AttributeMap[];
        lastEvaluatedKey?: AttributeMap;
    };
    queryByHashKey(hashValue: AttributeMap, options?: {
        limit?: number;
        scanIndexForward?: boolean;
        exclusiveStartKey?: AttributeMap;
    }): {
        items: AttributeMap[];
        lastEvaluatedKey?: AttributeMap;
    };
    queryIndex(indexName: string, hashValue: AttributeMap, options?: {
        limit?: number;
        scanIndexForward?: boolean;
        exclusiveStartKey?: AttributeMap;
    }): {
        items: AttributeMap[];
        lastEvaluatedKey?: AttributeMap;
        indexKeySchema: KeySchemaElement[];
    };
    scanIndex(indexName: string, limit?: number, exclusiveStartKey?: AttributeMap): {
        items: AttributeMap[];
        lastEvaluatedKey?: AttributeMap;
        indexKeySchema: KeySchemaElement[];
    };
    hasIndex(indexName: string): boolean;
    getIndexKeySchema(indexName: string): KeySchemaElement[] | undefined;
    private attributeEquals;
    private compareAttributes;
    getAllItems(): AttributeMap[];
    clear(): void;
    onStreamRecord(callback: StreamCallback): () => void;
    private emitStreamRecord;
    expireTtlItems(currentTimeSeconds: number): AttributeMap[];
}

interface CreateTableInput {
    TableName: string;
    KeySchema: KeySchemaElement[];
    AttributeDefinitions: AttributeDefinition[];
    ProvisionedThroughput?: ProvisionedThroughput;
    BillingMode?: 'PROVISIONED' | 'PAY_PER_REQUEST';
    GlobalSecondaryIndexes?: GlobalSecondaryIndex[];
    LocalSecondaryIndexes?: LocalSecondaryIndex[];
    StreamSpecification?: StreamSpecification;
    TimeToLiveSpecification?: TimeToLiveSpecification;
}
declare class TableStore {
    private tables;
    private region;
    constructor(region?: string);
    createTable(input: CreateTableInput): Table;
    getTable(tableName: string): Table;
    hasTable(tableName: string): boolean;
    deleteTable(tableName: string): Table;
    listTables(exclusiveStartTableName?: string, limit?: number): {
        tableNames: string[];
        lastEvaluatedTableName?: string;
    };
    clear(): void;
    expireTtlItems(currentTimeSeconds: number): void;
}

type Engine = 'memory' | 'java';
interface DynamoDBServerConfig {
    port?: number;
    region?: string;
    hostname?: string;
    /**
     * The engine to use for the DynamoDB server.
     * - 'memory': Fast in-memory implementation (default)
     * - 'java': Java-based DynamoDB Local (requires dynamo-db-local package)
     */
    engine?: Engine;
}
interface MutableEndpoint {
    protocol: string;
    hostname: string;
    port?: number;
    path: string;
}
declare class DynamoDBServer {
    private server?;
    private javaServer?;
    private store;
    private clock;
    private config;
    private endpoint;
    private client?;
    private documentClient?;
    private streamCallbacks;
    constructor(config?: DynamoDBServerConfig);
    listen(port?: number): Promise<void>;
    stop(): Promise<void>;
    get port(): number;
    get engine(): Engine;
    getEndpoint(): MutableEndpoint;
    getClient(): DynamoDBClient;
    getDocumentClient(): DynamoDBDocumentClient;
    /**
     * Advance the virtual clock by the specified number of milliseconds.
     * This triggers TTL processing for expired items.
     * Only available when using the 'memory' engine.
     */
    advanceTime(ms: number): void;
    /**
     * Set the virtual clock to the specified timestamp.
     * This triggers TTL processing for expired items.
     * Only available when using the 'memory' engine.
     */
    setTime(timestamp: number): void;
    /**
     * Get the current virtual clock time.
     * Only available when using the 'memory' engine.
     */
    getTime(): number;
    private processTTL;
    /**
     * Register a callback for stream records on a specific table.
     * Only available when using the 'memory' engine.
     */
    onStreamRecord(tableName: string, callback: StreamCallback): () => void;
    /**
     * Reset the server, clearing all tables and data.
     * Only available when using the 'memory' engine.
     */
    reset(): void;
    /**
     * Get the internal table store.
     * Only available when using the 'memory' engine.
     */
    getTableStore(): TableStore;
}

declare class VirtualClock {
    private offset;
    now(): number;
    nowInSeconds(): number;
    advance(ms: number): void;
    set(timestamp: number): void;
    reset(): void;
}

declare class DynamoDBError extends Error {
    readonly __type: string;
    readonly statusCode: number;
    constructor(type: string, message: string, statusCode?: number);
    toJSON(): {
        __type: string;
        message: string;
    };
}
declare class ValidationException extends DynamoDBError {
    constructor(message: string);
}
declare class ResourceNotFoundException extends DynamoDBError {
    constructor(message: string);
}
declare class ResourceInUseException extends DynamoDBError {
    constructor(message: string);
}
declare class ConditionalCheckFailedException extends DynamoDBError {
    readonly Item?: Record<string, unknown>;
    constructor(message?: string, item?: Record<string, unknown>);
    toJSON(): {
        Item?: Record<string, unknown> | undefined;
        __type: string;
        message: string;
    };
}
interface CancellationReason {
    Code: 'None' | 'ConditionalCheckFailed' | 'ItemCollectionSizeLimitExceeded' | 'TransactionConflict' | 'ProvisionedThroughputExceeded' | 'ThrottlingError' | 'ValidationError';
    Message?: string | null;
    Item?: Record<string, unknown>;
}
declare class TransactionCanceledException extends DynamoDBError {
    readonly CancellationReasons: CancellationReason[];
    constructor(message: string, reasons: CancellationReason[]);
    toJSON(): {
        __type: string;
        message: string;
        CancellationReasons: CancellationReason[];
    };
}
declare class TransactionConflictException extends DynamoDBError {
    constructor(message?: string);
}
declare class ProvisionedThroughputExceededException extends DynamoDBError {
    constructor(message?: string);
}
declare class ItemCollectionSizeLimitExceededException extends DynamoDBError {
    constructor(message?: string);
}
declare class InternalServerError extends DynamoDBError {
    constructor(message?: string);
}
declare class SerializationException extends DynamoDBError {
    constructor(message: string);
}
declare class IdempotentParameterMismatchException extends DynamoDBError {
    constructor(message?: string);
}

export { type AttributeDefinition, type AttributeMap, type AttributeValue, type CancellationReason, ConditionalCheckFailedException, type ConsumedCapacity, DynamoDBError, DynamoDBServer, type DynamoDBServerConfig, type Engine, type GlobalSecondaryIndex, type GlobalSecondaryIndexDescription, IdempotentParameterMismatchException, InternalServerError, ItemCollectionSizeLimitExceededException, type KeySchemaElement, type LocalSecondaryIndex, type LocalSecondaryIndexDescription, type Projection, type ProvisionedThroughput, ProvisionedThroughputExceededException, ResourceInUseException, ResourceNotFoundException, SerializationException, type StreamCallback, type StreamRecord, type StreamSpecification, type StreamViewType, type TableDescription, type TimeToLiveSpecification, TransactionCanceledException, TransactionConflictException, ValidationException, VirtualClock };
