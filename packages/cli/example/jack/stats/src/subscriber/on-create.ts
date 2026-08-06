import { redis } from '@awsless/redis'
import { h } from 'awsless'
import { taskCreated } from '../../../topics'
import { stats } from '../cache'

// The topic definition carries the payload schema, so the message
// arrives parsed & typed.
export default h.subscribe(taskCreated, async () => {
	await redis.string.incr(stats, 'created', 1)
})
