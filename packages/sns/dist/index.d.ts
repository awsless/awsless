import { SNSClient } from '@aws-sdk/client-sns';
import { Mock } from 'vitest';
import { Struct } from '@awsless/validate';

type Attributes = {
    [key: string]: string;
};
interface PublishOptions<Payload = unknown> {
    client?: SNSClient;
    topic: string;
    subject?: string;
    payload?: Payload;
    attributes?: Attributes;
    region?: string;
    accountId?: string;
}

declare const publish: ({ client, topic, subject, payload, attributes, region, accountId, }: PublishOptions) => Promise<void>;

type Topics = {
    [key: string]: (payload: any) => any;
};
declare const mockSNS: <T extends Topics>(topics: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

declare const snsClient: {
    (): SNSClient;
    set(client: SNSClient): void;
};

declare const snsStruct: <A, B>(message: Struct<A, B>) => Struct<A[], Struct<A, B>>;

export { PublishOptions, mockSNS, publish, snsClient, snsStruct };
