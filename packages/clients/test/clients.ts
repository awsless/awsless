
import { describe, it, expect } from 'vitest'
import { dynamoDBDocumentClient, iotClient, lambdaClient, schedulerClient, sesClient, snsClient, sqsClient, ssmClient } from '../src'

process.env.IOT_ENDPOINT = 'endpoint'

describe('clients', () => {

	const clients = [
		dynamoDBDocumentClient,
		lambdaClient,
		schedulerClient,
		sesClient,
		snsClient,
		sqsClient,
		ssmClient
	]

	const promiseBasedClients = [
		iotClient
	]

	it('normal based', async () => {
		clients.forEach(api => {
			const client = api.get()
			expect(client).toBeDefined()
			expect(client.send).toBeDefined()
			expect(client).toBe(api.get())

			// @ts-ignore
			api.set(client)
		})
	})

	it('promise based', async () => {
		await Promise.all(promiseBasedClients.map(async api => {
			const promise = api.get()
			const client = await promise

			expect(client).toBeDefined()
			expect(client.send).toBeDefined()
			expect(client).toBe(await api.get())
			expect(promise).toBe(api.get())

			// @ts-ignore
			api.set(promise)
		}))
	})
})
