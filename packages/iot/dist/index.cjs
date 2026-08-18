Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_iot_data_plane = require("@aws-sdk/client-iot-data-plane");
let _awsless_utils = require("@awsless/utils");
let _aws_sdk_client_iot = require("@aws-sdk/client-iot");
let aws_sdk_vitest_mock = require("aws-sdk-vitest-mock");
//#region src/client.ts
const iotClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_iot_data_plane.IoTDataPlaneClient({});
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
	const command = new _aws_sdk_client_iot_data_plane.PublishCommand(props);
	await client.send(command);
};
//#endregion
//#region src/mock.ts
const mockIoT = () => {
	const fn = vi.fn();
	(0, aws_sdk_vitest_mock.mockClient)(_aws_sdk_client_iot.IoTClient).on(_aws_sdk_client_iot.DescribeEndpointCommand).resolves({ endpointAddress: "endpoint" });
	(0, aws_sdk_vitest_mock.mockClient)(_aws_sdk_client_iot_data_plane.IoTDataPlaneClient).on(_aws_sdk_client_iot_data_plane.PublishCommand).callsFake(async () => {
		fn();
		return {};
	});
	beforeEach(() => {
		fn.mockClear();
	});
	return fn;
};
//#endregion
Object.defineProperty(exports, "IoTDataPlaneClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_iot_data_plane.IoTDataPlaneClient;
	}
});
exports.QoS = QoS;
exports.iotClient = iotClient;
exports.mockIoT = mockIoT;
exports.publish = publish;
