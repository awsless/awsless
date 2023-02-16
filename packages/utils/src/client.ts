
type GlobalClient = {
	<Client>(factory: () => Client): { (): Client, set(client: Client): void }
	<Client>(factory: () => Promise<Client>): { (): Promise<Client>, set(client: Client): void }
}

export const globalClient:GlobalClient = <Client>(factory: () => Client | Promise<Client>) => {
	let singleton:Client | Promise<Client>

	const getter = () => {
		if(!singleton) {
			singleton = factory()
		}

		return singleton
	}

	getter.set = (client: Client) => {
		singleton = client
	}

	return getter
}
