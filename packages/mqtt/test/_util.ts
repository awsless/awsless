import Connection from 'mqtt-connection'
import { Server } from 'net'

export const createServer = () => {
	const server = new Server()
	const clients = new Set<Connection.Connection>()

	server.on('connection', stream => {
		const client = new Connection(stream)

		client.on('connect', () => {
			client.connack({ returnCode: 0 })
			clients.add(client)
		})

		client.on('publish', packet => {
			if (packet.messageId) {
				client.puback({ messageId: packet.messageId })
			}

			client.publish(packet)
		})

		client.on('subscribe', packet => {
			client.suback({ granted: [packet.qos], messageId: packet.messageId })
		})

		client.on('unsubscribe', packet => {
			client.unsuback({ granted: [packet.qos], messageId: packet.messageId })
		})

		client.on('pingreq', packet => {
			client.pingresp(packet)
		})

		client.on('disconnect', packet => {
			clients.delete(client)
		})
	})

	server.listen(1883)

	return {
		...server,
		disconnectAllClients() {
			return Promise.all(
				[...clients].map(client => {
					return new Promise<void>(resolve =>
						client.disconnect({}, () => {
							resolve()
						})
					)
				})
			)
		},
	}
}
