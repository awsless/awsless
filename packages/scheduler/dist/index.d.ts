import * as _aws_sdk_client_scheduler from '@aws-sdk/client-scheduler';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import { Mock } from 'vitest';

interface CreateSchedule {
    client?: SchedulerClient;
    lambda: string;
    payload: unknown;
    date: Date;
    idempotentKey: string;
    roleArn: string;
    timezone?: string;
    region?: string;
    accountId?: string;
}
interface DeleteSchedule {
    client?: SchedulerClient;
    idempotentKey: string;
}

declare const schedule: ({ client, lambda, payload, date, idempotentKey, roleArn, timezone, region, accountId, }: CreateSchedule) => Promise<_aws_sdk_client_scheduler.CreateScheduleCommandOutput>;
declare const deleteSchedule: ({ client, idempotentKey }: DeleteSchedule) => Promise<_aws_sdk_client_scheduler.DeleteScheduleCommandOutput>;

type Lambdas = {
    [key: string]: (payload: any) => any;
};
declare const mockScheduler: <T extends Lambdas>(lambdas: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

declare const schedulerClient: {
    (): SchedulerClient;
    set(client: SchedulerClient): void;
};

export { deleteSchedule, mockScheduler, schedule, schedulerClient };
