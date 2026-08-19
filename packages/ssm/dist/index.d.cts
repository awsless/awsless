import { SSMClient, SSMClient as SSMClient$1 } from "@aws-sdk/client-ssm";
//#region src/client.d.ts
declare const ssmClient: {
  (): SSMClient$1;
  set(client: SSMClient$1): void;
};
//#endregion
//#region src/types.d.ts
type Paths = Record<string, string | Transformer>;
type Options = {
  client?: SSMClient$1;
  ttl?: number;
};
type Transformer = {
  path: string;
  transform: (value: string) => unknown;
};
type Output<T> = { [key in keyof T]: T[key] extends Transformer ? ReturnType<T[key]['transform']> : string; };
type PutParameter = {
  client?: SSMClient$1;
  name: string;
  value: string;
  type?: 'String' | 'StringList' | 'SecureString';
};
//#endregion
//#region src/ssm.d.ts
/** Fetch the provided ssm paths */
declare const ssm: <T extends Paths>(paths: T, { client, ttl }?: Options) => Promise<Output<T>>;
//#endregion
//#region src/commands.d.ts
declare const putParameter: ({ client, name, value, type }: PutParameter) => Promise<import("@aws-sdk/client-ssm").PutParameterCommandOutput>;
//#endregion
//#region src/values.d.ts
declare const string: (path: string) => string;
declare const float: (path: string) => {
  path: string;
  transform(value: string): number;
};
declare const integer: (path: string, radix?: number) => {
  path: string;
  transform(value: string): number;
};
declare const array: (path: string, seperator?: string) => {
  path: string;
  transform(value: string): string[];
};
declare const json: <T = unknown>(path: string) => {
  path: string;
  transform(value: string): T;
};
//#endregion
//#region src/mock.d.ts
declare const mockSSM: (values: Record<string, string>) => import("vitest").Mock<() => void>;
//#endregion
export { type Paths, SSMClient, array, float, integer, json, mockSSM, putParameter, ssm, ssmClient, string };