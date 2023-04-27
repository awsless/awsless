// src/mock.ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { mockClient } from "aws-sdk-client-mock";
var mockSES = () => {
  const fn = vi.fn();
  mockClient(SESv2Client).on(SendEmailCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/client.ts
import { SESv2Client as SESv2Client2 } from "@aws-sdk/client-sesv2";
import { globalClient } from "@awsless/utils";
var sesClient = globalClient(() => {
  return new SESv2Client2({});
});

// src/commands.ts
import { SendEmailCommand as SendEmailCommand2 } from "@aws-sdk/client-sesv2";
var sendEmail = async ({ client = sesClient(), subject, from, to, html }) => {
  const command = new SendEmailCommand2({
    FromEmailAddress: from,
    Destination: {
      ToAddresses: to
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: "UTF-8"
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8"
          }
        }
      }
    }
  });
  return client.send(command);
};
export {
  mockSES,
  sendEmail,
  sesClient
};
