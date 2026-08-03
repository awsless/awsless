import { lambda } from '@awsless/lambda'
import { PubSub } from 'awsless'

export default lambda({
	async handle() {
		await PubSub.test.publish()
	},
})
