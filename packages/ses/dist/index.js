import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { mockClient } from "aws-sdk-client-mock";
import { globalClient } from "@awsless/utils";
//#region src/mock.ts
const mockSES = (handler) => {
	const fn = vi.fn(handler ?? (() => {}));
	mockClient(SESv2Client).on(SendEmailCommand).callsFake((input) => {
		fn(input);
	});
	beforeEach(() => {
		fn.mockClear();
	});
	return fn;
};
//#endregion
//#region src/client.ts
const sesClient = globalClient(() => {
	return new SESv2Client({});
});
//#endregion
//#region src/commands.ts
const sendEmail = async ({ client = sesClient(), subject, from, to, html }) => {
	const command = new SendEmailCommand({
		FromEmailAddress: from,
		Destination: { ToAddresses: to },
		Content: { Simple: {
			Subject: {
				Data: subject,
				Charset: "UTF-8"
			},
			Body: { Html: {
				Data: html,
				Charset: "UTF-8"
			} }
		} }
	});
	return client.send(command);
};
//#endregion
export { mockSES, sendEmail, sesClient };
