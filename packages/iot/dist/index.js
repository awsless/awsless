import { IoTDataPlaneClient, IoTDataPlaneClient as IoTDataPlaneClient$1, PublishCommand } from "@aws-sdk/client-iot-data-plane";
import { globalClient } from "@awsless/utils";
import { DescribeEndpointCommand, IoTClient } from "@aws-sdk/client-iot";
import { mockClient } from "aws-sdk-vitest-mock";
//#region src/client.ts
const iotClient = globalClient(() => {
	return new IoTDataPlaneClient$1({});
});
//#endregion
//#region src/commands.ts
let QoS = /* @__PURE__ */ function(QoS) {
	QoS[QoS["AtMostOnce"] = 0] = "AtMostOnce";
	QoS[QoS["AtLeastOnce"] = 1] = "AtLeastOnce";
	QoS[QoS["ExactlyOnce"] = 2] = "ExactlyOnce";
	return QoS;
}({});
const publish = async ({ client = iotClient(), ...props }) => {
	const command = new PublishCommand(props);
	await client.send(command);
};
//#endregion
//#region src/mock.ts
const mockIoT = () => {
	const fn = vi.fn();
	mockClient(IoTClient).on(DescribeEndpointCommand).resolves({ endpointAddress: "endpoint" });
	mockClient(IoTDataPlaneClient$1).on(PublishCommand).callsFake(async () => {
		fn();
		return {};
	});
	beforeEach(() => {
		fn.mockClear();
	});
	return fn;
};
//#endregion
export { IoTDataPlaneClient, QoS, iotClient, mockIoT, publish };
