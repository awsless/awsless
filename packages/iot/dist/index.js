// src/index.ts
import { IoTDataPlaneClient as IoTDataPlaneClient4 } from "@aws-sdk/client-iot-data-plane";

// src/commands.ts
import { PublishCommand } from "@aws-sdk/client-iot-data-plane";

// src/client.ts
import { IoTDataPlaneClient } from "@aws-sdk/client-iot-data-plane";
import { globalClient } from "@awsless/utils";
var iotClient = globalClient(() => {
  return new IoTDataPlaneClient({});
});

// src/commands.ts
var QoS = /* @__PURE__ */ ((QoS2) => {
  QoS2[QoS2["AtMostOnce"] = 0] = "AtMostOnce";
  QoS2[QoS2["AtLeastOnce"] = 1] = "AtLeastOnce";
  QoS2[QoS2["ExactlyOnce"] = 2] = "ExactlyOnce";
  return QoS2;
})(QoS || {});
var publish = async ({ client = iotClient(), ...props }) => {
  const command = new PublishCommand(props);
  await client.send(command);
};

// src/mock.ts
import { DescribeEndpointCommand, IoTClient } from "@aws-sdk/client-iot";
import { IoTDataPlaneClient as IoTDataPlaneClient3, PublishCommand as PublishCommand2 } from "@aws-sdk/client-iot-data-plane";
import { mockClient } from "aws-sdk-client-mock";
var mockIoT = () => {
  const fn = vi.fn();
  mockClient(IoTClient).on(DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  mockClient(IoTDataPlaneClient3).on(PublishCommand2).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
export {
  IoTDataPlaneClient4 as IoTDataPlaneClient,
  QoS,
  iotClient,
  mockIoT,
  publish
};
