import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';
import { SESv2Client } from '@aws-sdk/client-sesv2';

declare const mockSES: () => vitest_dist_index_5aad25c1.x<any[], any>;

declare const sesClient: {
    (): SESv2Client;
    set(client: SESv2Client): void;
};

export { mockSES, sesClient };
