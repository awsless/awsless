import { Field } from "@aws-sdk/client-rds-data";
//#region src/fake-data-api.d.ts
type FakeOptions = {
  url: string;
  paused?: number;
  timeout?: number;
};
declare const fakeDataApi: (options: FakeOptions) => {
  send: (command: {
    constructor: {
      name: string;
    };
    input: object;
  }) => Promise<{
    $metadata: {};
    numberOfRecordsUpdated: number;
    columnMetadata: {
      name: string;
      label: string;
      typeName: string;
    }[];
    records: Field[][];
  } | {
    $metadata: {};
    transactionId: `${string}-${string}-${string}-${string}-${string}`;
    transactionStatus?: undefined;
  } | {
    transactionId?: undefined;
    $metadata: {};
    transactionStatus: string;
  }>;
  calls: {
    name: string;
    input: Record<string, unknown>;
  }[];
  pause(count: number): void;
  close(): Promise<void>;
};
//#endregion
export { fakeDataApi };