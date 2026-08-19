import { SNSClient, SNSClient as SNSClient$1 } from "@aws-sdk/client-sns";
import { Mock } from "vitest";
//#region src/types.d.ts
type Attributes = {
  [key: string]: string;
};
interface PublishOptions {
  client?: SNSClient$1;
  topic: string;
  subject?: string;
  payload?: string;
  attributes?: Attributes;
  region?: string;
  accountId?: string;
}
//#endregion
//#region src/commands.d.ts
declare const publish: ({ client, topic, subject, payload, attributes, region, accountId }: PublishOptions) => Promise<void>;
//#endregion
//#region src/mock.d.ts
type Topics = {
  [key: string]: (payload: any) => any;
};
declare const mockSNS: <T extends Topics>(topics: T) => { [P in keyof T]: Mock<(...args: any[]) => any>; };
//#endregion
//#region src/client.d.ts
declare const snsClient: {
  (): SNSClient$1;
  set(client: SNSClient$1): void;
};
//#endregion
export { type PublishOptions, SNSClient, mockSNS, publish, snsClient };