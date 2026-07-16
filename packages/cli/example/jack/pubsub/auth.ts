import { lambda } from '@awsless/lambda'

export default lambda({
	handle() {
		return {
			authorized: true,
			allowed: ['topic', 'other'],
			context: { userId: 1 },
		}
	},
})
