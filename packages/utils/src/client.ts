import { addTraceMiddleware } from './trace'

type GlobalClient = {
	<Client>(factory: () => Client): { (): Client; set(client: Client): void }
	<Client>(factory: () => Promise<Client>): { (): Promise<Client>; set(client: Client): void }
}

// A client made by the factory gets a span per AWS SDK call when tracing is on; a client set by hand (a test's mock) doesn't.
export const globalClient: GlobalClient = <Client>(factory: () => Client | Promise<Client>) => {
	let singleton: Client | Promise<Client>

	const getter = () => {
		if (!singleton) {
			const client = factory()

			if (client instanceof Promise) {
				singleton = client.then(resolved => {
					addTraceMiddleware(resolved)
					return resolved
				})
			} else {
				addTraceMiddleware(client)
				singleton = client
			}
		}

		return singleton
	}

	getter.set = (client: Client) => {
		singleton = client
	}

	return getter
}
