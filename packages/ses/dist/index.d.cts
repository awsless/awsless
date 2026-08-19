import { SESv2Client } from "@aws-sdk/client-sesv2";
//#region src/mock.d.ts
declare const mockSES: (handler?: (input: unknown) => void) => import("vitest").Mock<(input: unknown) => void>;
//#endregion
//#region src/client.d.ts
declare const sesClient: {
  (): SESv2Client;
  set(client: SESv2Client): void;
};
//#endregion
//#region src/types.d.ts
interface SendEmail {
  client?: SESv2Client;
  subject: string;
  from: string;
  to: string[];
  html: string;
}
//#endregion
//#region src/commands.d.ts
declare const sendEmail: ({ client, subject, from, to, html }: SendEmail) => Promise<import("@aws-sdk/client-sesv2").SendEmailCommandOutput>;
//#endregion
export { mockSES, sendEmail, sesClient };