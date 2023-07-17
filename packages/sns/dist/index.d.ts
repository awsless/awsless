import * as _aws_sdk_client_sns from '@aws-sdk/client-sns';
import { SNSClient } from '@aws-sdk/client-sns';
import { Mock } from 'vitest';
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
declare const mockSNS: <T extends Topics>(topics: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

declare const snsClient: {
    (): SNSClient;
    set(client: SNSClient): void;
};

declare const snsStruct: <A, B>(message: Struct<A, B>) => Struct<A[], Struct<A, B>>;

export { mockSNS, publish, snsClient, snsStruct };
