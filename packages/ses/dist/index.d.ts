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
type EmailHeader = {
  /** Printable ASCII without a colon, at most 126 characters. */
  name: string;
  /** Printable ASCII, at most 995 characters (name and value together at most 996). */
  value: string;
};
interface SendEmail {
  client?: SESv2Client;
  subject: string;
  from: string;
  to: string[];
  html: string;
  /** The plain text alternative, next to the html. */
  text?: string;
  /**
   * Extra headers on the message, like `List-Unsubscribe` (at most 15).
   * SES refuses the ones it sets itself (From, To, Subject, Date,
   * Message-ID, Content-Type, MIME-Version and the like).
   */
  headers?: EmailHeader[];
}
//#endregion
//#region src/commands.d.ts
declare const sendEmail: ({ client, subject, from, to, html, text, headers }: SendEmail) => Promise<import("@aws-sdk/client-sesv2").SendEmailCommandOutput>;
//#endregion
export { type EmailHeader, type SendEmail, mockSES, sendEmail, sesClient };