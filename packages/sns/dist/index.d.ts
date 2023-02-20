import * as _aws_sdk_client_sns from '@aws-sdk/client-sns';
import { SNSClient } from '@aws-sdk/client-sns';
import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';
import * as superstruct_dist_utils from 'superstruct/dist/utils';
import { Struct } from '@awsless/validate';

type Attributes = {
    [key: string]: string;
};
interface Publish {
    client?: SNSClient;
    topic: string;
    subject?: string;
    payload?: any;
    attributes?: Attributes;
    region?: string;
    accountId?: string;
}

declare const publish: ({ client, topic, subject, payload, attributes, region, accountId, }: Publish) => Promise<_aws_sdk_client_sns.PublishCommandOutput>;

type Topics = {
    [key: string]: (payload: any) => any;
};
declare const mockSNS: <T extends Topics>(topics: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: unknown[]) => unknown>; };

declare const snsClient: {
    (): SNSClient;
    set(client: SNSClient): void;
};

type Input<T> = {
    Records: {
        Sns: {
            Message: T;
        };
    }[];
};
declare const snsRecords: <T>(input: Input<T>) => T[];
declare const snsStruct: <A, B>(message: Struct<A, B>) => Struct<{
    Records: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        Sns: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            TopicArn: string;
            MessageId: string;
            Timestamp: Date;
            Message: A;
        }>>;
    }>>[];
}, {
    Records: Struct<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        Sns: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            TopicArn: string;
            MessageId: string;
            Timestamp: Date;
            Message: A;
        }>>;
    }>>[], Struct<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        Sns: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            TopicArn: string;
            MessageId: string;
            Timestamp: Date;
            Message: A;
        }>>;
    }>>, {
        Sns: Struct<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
            TopicArn: string;
            MessageId: string;
            Timestamp: Date;
            Message: A;
        }>>, {
            TopicArn: Struct<string, null>;
            MessageId: Struct<string, null>;
            Timestamp: Struct<Date, null>;
            Message: Struct<A, B>;
        }>;
    }>>;
}>;

export { mockSNS, publish, snsClient, snsRecords, snsStruct };
