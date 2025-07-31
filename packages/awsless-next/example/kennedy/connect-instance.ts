export default async () => {
	const result = await fetch('http://test.app-kennedy.internal:80', {
		method: 'GET',
	})

	if (!result.ok) {
		throw new Error(`Failed to connect to instance: ${result.statusText}`)
	}

	const data = await result.text()

	console.log('Connected to instance successfully:', data)

	return data
}
