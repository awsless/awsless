import { BUNDLE_NAME, getBundleQualifier } from '../src/lib/server/util'

const restoreEnv = (name: string, value: string | undefined) => {
	if (value === undefined) {
		delete process.env[name]
	} else {
		process.env[name] = value
	}
}

describe('bundle qualifier', () => {
	const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME
	const functionVersion = process.env.AWS_LAMBDA_FUNCTION_VERSION

	afterEach(() => {
		restoreEnv('AWS_LAMBDA_FUNCTION_NAME', functionName)
		restoreEnv('AWS_LAMBDA_FUNCTION_VERSION', functionVersion)
	})

	it('keeps nested calls on the executing bundle version', () => {
		process.env.AWS_LAMBDA_FUNCTION_NAME = BUNDLE_NAME
		process.env.AWS_LAMBDA_FUNCTION_VERSION = '42'

		expect(getBundleQualifier()).toBe('42')
	})

	it('uses live outside the bundle', () => {
		process.env.AWS_LAMBDA_FUNCTION_NAME = 'app--stack--function--standalone'
		process.env.AWS_LAMBDA_FUNCTION_VERSION = '42'

		expect(getBundleQualifier()).toBe('live')
	})
})
