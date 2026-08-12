import { mockLambda } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { getPubSubPublisherName } from '../server/pubsub.js'

export interface PubSubMock {}
export interface PubSubMockResponse {}

export const mockPubSub = (cb: (mock: PubSubMock) => void): PubSubMockResponse => {
	const list: Record<string, any> = {}
	const mock: PubSubMock = createProxy(name => {
		return (handle: unknown) => {
			list[getPubSubPublisherName(name)] = handle ?? (() => {})
		}
	})

	cb(mock)

	const result = mockLambda(list)

	return createProxy(name => {
		return result[getPubSubPublisherName(name)]
	})
}
