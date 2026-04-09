import { lambda } from '@awsless/lambda'

export default lambda({
	handle() {
		const chunks: Uint8Array[] = []

		while (true) {
			chunks.push(new Uint8Array(64 * 1024 * 1024).fill(255))
		}
	},
})
