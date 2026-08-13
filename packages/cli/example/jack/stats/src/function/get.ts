import { parse } from '@awsless/big-float'
import { redis } from '@awsless/redis'
import { h, v } from 'awsless'
import { stats } from '../cache'

export default h.func(v.string(), async name => {
	const result = await redis.string.get(stats, name)
	return parse(result ?? 0)
})
