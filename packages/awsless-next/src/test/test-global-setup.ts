import { BigFloat, eq } from '@awsless/big-float'
// import { expect } from 'vitest'

// import type { TestProject } from 'vitest/node'

// export default function setup(project: TestProject) {
// 	process.env.TZ = 'UTC'

// 	// project.vitest.
// 	expect.addEqualityTesters([areBigFloatsEqual])

// 	// project.onTestsRerun(async () => {
// 	// 	await restartDb()
// 	// })
// }

// export const setup = () => {
// 	process.env.TZ = 'UTC'

// 	expect.addEqualityTesters([areBigFloatsEqual])
// }

beforeAll(() => {
	process.env.TZ = 'UTC'
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
