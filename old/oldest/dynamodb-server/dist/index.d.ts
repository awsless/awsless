import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

declare class DynamoDBServer {
    private region;
    private client?;
    private documentClient?;
    private endpoint;
    private process;
    constructor(region?: string);
    listen(port: number): Promise<void>;
    /** Kill the DynamoDB server. */
    kill(): Promise<void>;
    /** Ping the DynamoDB server if its ready. */
    ping(): Promise<boolean>;
    /** Ping the DynamoDB server untill its ready. */
    wait(times?: number): Promise<void>;
    /** Get DynamoDBClient connected to dynamodb local. */
    getClient(): DynamoDBClient;
    /** Get DynamoDBDocumentClient connected to dynamodb local. */
    getDocumentClient(): DynamoDBDocumentClient;
}

export { DynamoDBServer };
