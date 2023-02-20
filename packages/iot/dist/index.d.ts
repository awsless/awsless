import { IoTDataPlaneClient } from '@aws-sdk/client-iot-data-plane';
import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';

interface PublishOptions {
    client?: IoTDataPlaneClient;
    topic: string;
    id?: string | number;
    event: string;
    value?: any;
    qos?: 0 | 1 | 2;
}

declare const publish: ({ client, topic, id, event, value, qos }: PublishOptions) => Promise<void>;

declare const mockIoT: () => vitest_dist_index_5aad25c1.x<any[], any>;

declare const iotClient: {
    (): IoTDataPlaneClient;
    set(client: IoTDataPlaneClient): void;
};

export { iotClient, mockIoT, publish };
