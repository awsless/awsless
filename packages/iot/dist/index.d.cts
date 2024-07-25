import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Mock } from 'vitest';

declare enum QoS {
    AtMostOnce = 0,
    AtLeastOnce = 1,
    ExactlyOnce = 2
}
type PublishProps = {
    client?: IoTDataPlaneClient;
    topic: string;
    payload?: Uint8Array;
    qos?: QoS;
    retain?: boolean;
    contentType?: string;
};
declare const publish: ({ client, ...props }: PublishProps) => Promise<void>;

declare const mockIoT: () => Mock<any, any>;

declare const iotClient: {
    (): IoTDataPlaneClient;
    set(client: IoTDataPlaneClient): void;
};

export { PublishProps, QoS, iotClient, mockIoT, publish };
