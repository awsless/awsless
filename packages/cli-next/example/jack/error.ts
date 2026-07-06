import { lambda } from '@awsless/lambda'

export default lambda({
	handle: () => {
		throw new Error('My Own Error')
	},
})
