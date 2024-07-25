import { mockIoT } from '@awsless/iot'
import { Mock } from 'vitest'

export const mockPubSub = (): Mock => {
	return mockIoT()
}
