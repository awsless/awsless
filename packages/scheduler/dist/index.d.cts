import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { Duration } from "@awsless/duration";
//#region src/commands.d.ts
type CreateSchedule = {
  name: string;
  payload?: unknown;
  schedule: Date | Duration;
  roleArn: string;
  group?: string;
  client?: SchedulerClient;
  idempotentKey?: string;
  timezone?: string;
  region?: string;
  accountId?: string;
  deadLetterArn?: string;
  retryAttempts?: number;
};
declare const schedule: ({ client, name, group, payload, schedule, idempotentKey, roleArn, timezone, deadLetterArn, retryAttempts, region, accountId }: CreateSchedule) => Promise<void>;
//#endregion
//#region src/mock.d.ts
type Lambdas = {
  [key: string]: (payload: any) => any;
};
declare const mockScheduler: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: import("vitest").Mock<(...args: any[]) => any>; };
//#endregion
//#region src/client.d.ts
declare const schedulerClient: {
  (): SchedulerClient;
  set(client: SchedulerClient): void;
};
//#endregion
export { mockScheduler, schedule, schedulerClient };