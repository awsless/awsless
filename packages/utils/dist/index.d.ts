type GlobalClient = {
    <Client>(factory: () => Client): {
        get(): Client;
        set(client: Client): void;
    };
    <Client>(factory: () => Promise<Client>): {
        get(): Promise<Client>;
        set(client: Client): void;
    };
};
declare const globalClient: GlobalClient;

export { globalClient };
