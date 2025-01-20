import { SNSClient } from '@aws-sdk/client-sns';
import { Mock } from 'vitest';

type Attributes = {
    [key: string]: string;
};
interface PublishOptions {
    client?: SNSClient;
    topic: string;
    subject?: string;
    payload?: string;
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

export { type PublishOptions, mockSNS, publish, snsClient };
