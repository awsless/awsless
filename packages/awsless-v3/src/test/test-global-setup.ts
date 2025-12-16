import { BigFloat, eq } from '@awsless/big-float'
import { $mockdate, setGlobalTypes } from '@awsless/json'

beforeAll(() => {
	// Set timezone for dates to UTC-0 to get consistant test results
	process.env.TZ = 'UTC'

	// FIX json stringify & parse for MockDate's
	setGlobalTypes({ $mockdate })

	// FIX equality checks for bigfloats
	expect.addEqualityTesters([areBigFloatsEqual])
})

export const areBigFloatsEqual = (a: unknown, b: unknown): boolean | undefined => {
	const isA = a instanceof BigFloat
	const isB = b instanceof BigFloat

	if (isA && isB) {
		return eq(a, b)
	} else if (isA === isB) {
		return undefined
	} else {
		return false
	}
}
