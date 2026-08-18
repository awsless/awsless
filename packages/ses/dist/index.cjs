Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_sesv2 = require("@aws-sdk/client-sesv2");
let aws_sdk_client_mock = require("aws-sdk-client-mock");
let _awsless_utils = require("@awsless/utils");
//#region src/mock.ts
const mockSES = (handler) => {
	const fn = vi.fn(handler ?? (() => {}));
	(0, aws_sdk_client_mock.mockClient)(_aws_sdk_client_sesv2.SESv2Client).on(_aws_sdk_client_sesv2.SendEmailCommand).callsFake((input) => {
		fn(input);
	});
	beforeEach(() => {
		fn.mockClear();
	});
	return fn;
};
//#endregion
//#region src/client.ts
const sesClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_sesv2.SESv2Client({});
});
//#endregion
//#region src/commands.ts
const sendEmail = async ({ client = sesClient(), subject, from, to, html }) => {
	const command = new _aws_sdk_client_sesv2.SendEmailCommand({
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
exports.mockSES = mockSES;
exports.sendEmail = sendEmail;
exports.sesClient = sesClient;
