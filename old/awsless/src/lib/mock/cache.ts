import { mockRedis } from '@awsless/redis'

export const mockCache = () => {
	return mockRedis()
}
