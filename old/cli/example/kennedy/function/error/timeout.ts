import { lambda } from '@awsless/lambda'

export default lambda({
	handle() {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve({
					statusCode: 200,
					body: '',
				})
			}, 15 * 1000)
		})
	},
})
