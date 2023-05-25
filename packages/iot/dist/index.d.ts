import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import { Mock } from 'vitest';

interface PublishOptions {
    client?: IoTDataPlaneClient;
    topic: string;
    id?: string | number;
    event: string;
    value?: any;
    qos?: 0 | 1 | 2;
}

declare const publish: ({ client, topic, id, event, value, qos }: PublishOptions) => Promise<void>;

declare const mockIoT: () => Mock<any, any>;

declare const iotClient: {
    (): IoTDataPlaneClient;
    set(client: IoTDataPlaneClient): void;
};

export { iotClient, mockIoT, publish };
