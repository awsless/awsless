import { lambda } from '@awsless/lambda'

export default lambda({
	handle() {
		throw new Error('normal error thrown inside a lambda')
	},
})
