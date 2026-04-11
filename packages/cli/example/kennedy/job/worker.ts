export default async (payload: { message: string }) => {
	console.log('Job started with payload:', payload)

	// Simulate some work
	await new Promise(resolve => setTimeout(resolve, 5000))

	console.log('Job finished')
}
