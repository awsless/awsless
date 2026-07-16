import { lambda } from '@awsless/lambda'

export default lambda({
	handle(event) {
		console.log(event)
	},
})
