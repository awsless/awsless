import { redis } from '@awsless/redis'
import { h, v } from 'awsless'
import { stats } from '../cache'

export default h.task(
	v.object({
		name: v.string(),
		value: v.bigfloat(),
	}),
	async ({ name, value }) => {
		await redis.string.incr(stats, name, value)
	}
)
