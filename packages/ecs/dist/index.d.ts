import { ECSClient } from '@aws-sdk/client-ecs';
export { ECSClient } from '@aws-sdk/client-ecs';

declare const ecsClient: {
    (): ECSClient;
    set(client: ECSClient): void;
};

type RunTaskOptions = {
    client?: ECSClient;
    cluster: string;
    taskDefinition: string;
    subnets: string[];
    securityGroups: string[];
    container: string;
    payload?: unknown;
    assignPublicIp?: boolean;
};
declare const runTask: ({ client, cluster, taskDefinition, subnets, securityGroups, container, payload, assignPublicIp, }: RunTaskOptions) => Promise<{
    taskArn: string | undefined;
}>;

type Tasks = {
    [key: string]: (payload: any) => unknown;
};
declare const mockEcs: <T extends Tasks>(tasks: T) => { [P in keyof T]: any; };

export { type RunTaskOptions, ecsClient, mockEcs, runTask };
