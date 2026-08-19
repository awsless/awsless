import { IClientOptions, MqttProtocol } from "mqtt";
//#region src/index.d.ts
declare enum QoS {
  AtMostOnce = 0,
  AtLeastOnce = 1,
  ExactlyOnce = 2
}
type ClientPropsProvider = () => ClientProps | Promise<ClientProps>;
type ClientProps = {
  endpoint: string;
  clientId?: string;
  protocol?: MqttProtocol;
  port?: number;
  username?: string;
  password?: string | Buffer;
} & IClientOptions;
type Unsubscribe = () => Promise<void>;
type MessageCallback = (payload: Buffer) => void | Promise<void>;
type DebugCallback = (...args: unknown[]) => void;
declare const createClient: (propsOrProvider: ClientProps | ClientPropsProvider, debug?: DebugCallback) => {
  readonly connected: boolean;
  readonly topics: string[];
  destroy(): Promise<void>;
  publish(topic: string, payload: string | Buffer, qos?: QoS): Promise<void>;
  subscribe(topic: string, callback: MessageCallback, qos?: QoS): Promise<Unsubscribe>;
};
//#endregion
export { ClientProps, ClientPropsProvider, DebugCallback, MessageCallback, QoS, Unsubscribe, createClient };