import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SSMClient } from '@aws-sdk/client-ssm';

declare const dynamoDBDocumentClient: {
    get(): DynamoDBDocumentClient;
    set(client: DynamoDBDocumentClient): void;
};

declare const iotClient: {
    get(): IoTDataPlaneClient;
    set(client: IoTDataPlaneClient): void;
};

declare const lambdaClient: {
    get(): LambdaClient;
    set(client: LambdaClient): void;
};

declare const schedulerClient: {
    get(): SchedulerClient;
    set(client: SchedulerClient): void;
};

declare const sesClient: {
    get(): SESv2Client;
    set(client: SESv2Client): void;
};

declare const snsClient: {
    get(): SNSClient;
    set(client: SNSClient): void;
};

declare const sqsClient: {
    get(): SQSClient;
    set(client: SQSClient): void;
};

declare const ssmClient: {
    get(): SSMClient;
    set(client: SSMClient): void;
};

export { dynamoDBDocumentClient, iotClient, lambdaClient, schedulerClient, sesClient, snsClient, sqsClient, ssmClient };
