import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';
import * as _aws_sdk_client_sesv2 from '@aws-sdk/client-sesv2';
import { SESv2Client } from '@aws-sdk/client-sesv2';

declare const mockSES: () => vitest_dist_index_5aad25c1.x<any[], any>;

declare const sesClient: {
    (): SESv2Client;
    set(client: SESv2Client): void;
};

interface SendEmail {
    client?: SESv2Client;
    subject: string;
    from: string;
    to: string[];
    html: string;
}

declare const sendEmail: ({ client, subject, from, to, html }: SendEmail) => Promise<_aws_sdk_client_sesv2.SendEmailCommandOutput>;

export { mockSES, sendEmail, sesClient };
