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
export {
  mockSES,
  sesClient
};
