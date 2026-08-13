import { mockSNS } from '@awsless/sns'
import { createProxy } from '../proxy.js'
import { getAlertName } from '../server/alert.js'

export interface AlertMock {}
export interface AlertMockResponse {}

export const mockAlert = (cb: (mock: AlertMock) => void): AlertMockResponse => {
	const list: Record<string, any> = {}
	const mock: AlertMock = createProxy(name => {
		return (handle: unknown) => {
			list[getAlertName(name)] = handle ?? (() => {})
		}
	})

	cb(mock)

	const result = mockSNS(list)

	return createProxy(name => {
		return result[getAlertName(name)]
	})
}

// mockAlert(mock => {
// 	mock.debug()
// })
