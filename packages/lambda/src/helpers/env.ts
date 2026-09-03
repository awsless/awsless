// The one test mode predicate every awsless runtime module shares, so
// the lambda wrapper & the resource proxies never disagree on the mode.
export const isTestEnv = () => {
	// An explicit LAMBDA_ENV wins, so a test can exercise the production paths.
	if (process.env.LAMBDA_ENV) {
		return process.env.LAMBDA_ENV === 'test'
	}

	return process.env.NODE_ENV === 'test' || !!process.env.VITEST
}
