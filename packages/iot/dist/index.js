// src/commands.ts
import { PublishCommand } from "@aws-sdk/client-iot-data-plane";

// src/client.ts
import { IoTDataPlaneClient } from "@aws-sdk/client-iot-data-plane";
import { globalClient } from "@awsless/utils";
var iotClient = globalClient(() => {
  return new IoTDataPlaneClient({});
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
  const command = new PublishCommand({
    qos,
    topic,
    payload: Buffer.from(JSON.stringify(payload))
  });
  await client.send(command);
};

// src/mock.ts
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import { IoTDataPlaneClient as IoTDataPlaneClient2, PublishCommand as PublishCommand2 } from "@aws-sdk/client-iot-data-plane";
import { mockClient } from "aws-sdk-client-mock";
var mockIoT = () => {
  const fn = vi.fn();
  mockClient(IoTClient).on(DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  mockClient(IoTDataPlaneClient2).on(PublishCommand2).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};
export {
  iotClient,
  mockIoT,
  publish
};
