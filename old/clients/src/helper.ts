
type GlobalClient = {
	<Client>(factory: () => Client): { get(): Client, set(client: Client): void }
	<Client>(factory: () => Promise<Client>): { get(): Promise<Client>, set(client: Client): void }
}

export const globalClient:GlobalClient = <Client>(factory: () => Client | Promise<Client>) => {
	let singleton:Client | Promise<Client>

	return {
		get() {
			if(!singleton) {
				singleton = factory()
			}

			return singleton
		},

		set(client: Client) {
			singleton = client
		}
	}
}
