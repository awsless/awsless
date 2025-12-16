export const sha256 = async (message: string) => {
	const msgBuffer = new TextEncoder().encode(message)
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

	return hashHex
}

const body = JSON.stringify([{ name: 'test' }])
const hash = await sha256(body)

await Promise.all(
	Array.from({ length: 10 }).map(async (_, i) => {
		const response = await fetch('https://d1zqejl7pvws2o.cloudfront.net', {
			body,
			method: 'POST',
			headers: {
				authentication: 'token',
				'content-type': 'application/json',
				'x-amz-content-sha256': hash,
			},
		})

		const result = await response.json()
		console.log(result)
	})
)
