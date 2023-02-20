"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  iotClient: () => iotClient,
  mockIoT: () => mockIoT,
  publish: () => publish
});
module.exports = __toCommonJS(src_exports);

// src/commands.ts
var import_client_iot_data_plane2 = require("@aws-sdk/client-iot-data-plane");

// src/client.ts
var import_client_iot_data_plane = require("@aws-sdk/client-iot-data-plane");
var import_utils = require("@awsless/utils");
var iotClient = (0, import_utils.globalClient)(() => {
  return new import_client_iot_data_plane.IoTDataPlaneClient({});
});

// src/commands.ts
var publish = async ({ client = iotClient(), topic, id, event, value, qos = 0 }) => {
  const payload = {
    e: event,
    v: value
  };
  if (id) {
    payload.i = id;
  }
  const command = new import_client_iot_data_plane2.PublishCommand({
    qos,
    topic,
    payload: Buffer.from(JSON.stringify(payload))
  });
  await client.send(command);
};

// src/mock.ts
var import_client_iot = require("@aws-sdk/client-iot");
var import_client_iot_data_plane3 = require("@aws-sdk/client-iot-data-plane");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockIoT = () => {
  const fn = vi.fn();
  (0, import_aws_sdk_client_mock.mockClient)(import_client_iot.IoTClient).on(import_client_iot.DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  (0, import_aws_sdk_client_mock.mockClient)(import_client_iot_data_plane3.IoTDataPlaneClient).on(import_client_iot_data_plane3.PublishCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  iotClient,
  mockIoT,
  publish
});
