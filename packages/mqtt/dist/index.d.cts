import { MqttProtocol } from 'mqtt';

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
};
type Unsubscribe = () => Promise<void>;
type MessageCallback = (payload: Buffer) => void | Promise<void>;
declare const createClient: (propsOrProvider: ClientProps | ClientPropsProvider) => {
    readonly connected: boolean;
    readonly topics: string[];
    destroy(): Promise<void>;
    publish(topic: string, payload: string | Buffer, qos?: QoS): Promise<void>;
    subscribe(topic: string, callback: MessageCallback): Promise<Unsubscribe>;
};

export { ClientProps, ClientPropsProvider, MessageCallback, QoS, Unsubscribe, createClient };
