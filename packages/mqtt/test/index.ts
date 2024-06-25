import { ClientProps, createClient, QoS } from '../src'
import { createServer } from './_util'

describe('MQTT', () => {
	const props: ClientProps = { endpoint: 'localhost', protocol: 'tcp', port: 1883 }
	const waitForServerResponse = (delay: number = 10) => new Promise(r => setTimeout(r, delay))
	const server = createServer()

	it('should create a lazy client without connecting', async () => {
		const client = createClient(props)

		expect(client.connected).toBe(false)
		expect(client.topics).toStrictEqual([])

		await client.destroy()
	})

	it('should publish & receive messages', async () => {
		const callback = vi.fn()
		const client = createClient(props)

		await client.subscribe('test', callback)
		await client.publish('test', 'Hello World!')
		await waitForServerResponse()

		expect(client.connected).toBe(true)
		expect(callback).toBeCalledTimes(1)

		await client.destroy()
	})

	it('should stay connected when subscribers are active', async () => {
		const callback = vi.fn()
		const client = createClient(props)

		const unsub = await client.subscribe('test', callback)
		await client.subscribe('test', callback)
		await client.publish('test', 'Hello World!', QoS.AtMostOnce)
		await unsub()
		await waitForServerResponse()

		expect(client.connected).toBe(true)
		expect(callback).toBeCalledTimes(1)

		await client.destroy()
	})

	it('should disconnect when no more subscribers are active', async () => {
		const callback = vi.fn()
		const client = createClient(props)

		const unsub = await client.subscribe('test', callback)
		await client.publish('test', 'Hello World!')
		await unsub()
		await waitForServerResponse()

		expect(client.connected).toBe(false)
		expect(callback).not.toBeCalled()

		await client.destroy()
	})

	it('should disconnect when destroying', async () => {
		const callback = vi.fn()
		const client = createClient(props)

		await client.subscribe('test', callback)
		await client.publish('test', 'Hello World!')
		await client.destroy()
		await waitForServerResponse()

		expect(client.connected).toBe(false)
		expect(callback).not.toBeCalled()
	})

	it('should reconnect', async () => {
		const callback = vi.fn()
		const setup = vi.fn(() => props)
		const client = createClient(setup)

		await client.subscribe('test', callback)
		await server.disconnectAllClients()
		await waitForServerResponse()
		expect(client.connected).toBe(false)

		await waitForServerResponse(1100)

		expect(client.connected).toBe(true)
		expect(setup).toBeCalledTimes(2)

		await client.destroy()
	})

	it('should queue up published messages when reconnecting', async () => {
		const callback = vi.fn()
		const setup = vi.fn(() => props)
		const client = createClient(setup)

		await client.subscribe('test', callback)
		await server.disconnectAllClients()
		await waitForServerResponse()
		expect(client.connected).toBe(false)

		await client.publish('test', 'Hello World!')
		await waitForServerResponse()

		expect(client.connected).toBe(true)
		expect(setup).toBeCalledTimes(2)
		expect(callback).toBeCalledTimes(1)

		await client.destroy()
	})
})
