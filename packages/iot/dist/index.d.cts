import { IoTDataPlaneClient, IoTDataPlaneClient as IoTDataPlaneClient$1 } from "@aws-sdk/client-iot-data-plane";
import { Mock } from "vitest";
//#region src/commands.d.ts
declare enum QoS {
  AtMostOnce = 0,
  AtLeastOnce = 1,
  ExactlyOnce = 2
}
type PublishProps = {
  client?: IoTDataPlaneClient$1;
  topic: string;
  payload?: Uint8Array;
  qos?: QoS;
  retain?: boolean;
  contentType?: string;
};
declare const publish: ({ client, ...props }: PublishProps) => Promise<void>;
//#endregion
//#region src/mock.d.ts
declare const mockIoT: () => Mock;
//#endregion
//#region src/client.d.ts
declare const iotClient: {
  (): IoTDataPlaneClient$1;
  set(client: IoTDataPlaneClient$1): void;
};
//#endregion
export { IoTDataPlaneClient, type PublishProps, QoS, iotClient, mockIoT, publish };