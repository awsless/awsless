type GlobalClient = {
    <Client>(factory: () => Client): {
        (): Client;
        set(client: Client): void;
    };
    <Client>(factory: () => Promise<Client>): {
        (): Promise<Client>;
        set(client: Client): void;
    };
};
declare const globalClient: GlobalClient;

export { globalClient };
