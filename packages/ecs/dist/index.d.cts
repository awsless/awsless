import { ECSClient, ECSClient as ECSClient$1 } from "@aws-sdk/client-ecs";
import { Mock } from "vitest";
//#region src/client.d.ts
declare const ecsClient: {
  (): ECSClient$1;
  set(client: ECSClient$1): void;
};
//#endregion
//#region src/commands.d.ts
type RunTaskOptions = {
  client?: ECSClient$1;
  cluster: string;
  taskDefinition: string;
  subnets: string[];
  securityGroups: string[];
  container: string;
  payload?: unknown;
  assignPublicIp?: boolean;
};
declare const runTask: ({ client, cluster, taskDefinition, subnets, securityGroups, container, payload, assignPublicIp }: RunTaskOptions) => Promise<{
  taskArn: string | undefined;
}>;
//#endregion
//#region src/mock.d.ts
type Tasks = {
  [key: string]: (payload: any) => unknown;
};
declare const mockEcs: <T extends Tasks>(tasks: T) => { [P in keyof T]: Mock<(...args: any[]) => any>; };
//#endregion
export { ECSClient, type RunTaskOptions, ecsClient, mockEcs, runTask };