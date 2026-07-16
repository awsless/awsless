import { createRedisClient, mockRedis, redis } from '../../src'

describe('PubSub', () => {
	mockRedis()

	const client = createRedisClient({})

	describe('publish', () => {
		it('publish without subscribers', async () => {
			const result = await redis.pubsub.publish(client, 'channel', 'message')

			expect(result).toBe(0)
			expectTypeOf(result).toBeNumber()
		})

		it('publish to a subscriber', async () => {
			const subscriber = createRedisClient({})
			await subscriber.send('subscribe', ['channel'])

			const result = await redis.pubsub.publish(client, 'channel', 'message')
			expect(result).toBe(1)

			await subscriber.destroy()
		})

		it('publish sharded', async () => {
			const result = await redis.pubsub.publish(client, 'channel', 'message', {
				sharded: true,
			})

			expect(result).toBe(0)
			expectTypeOf(result).toBeNumber()
		})

		it('publish in batch', async () => {
			const result = await redis.batch(client, [
				redis.pubsub.publish(client, 'channel-1', 'message'),
				redis.pubsub.publish(client, 'channel-2', 'message'),
			])

			expect(result).toStrictEqual([0, 0])
		})
	})
})
