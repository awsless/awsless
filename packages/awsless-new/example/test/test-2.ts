describe('Test 2', () => {
	it('log', () => {
		console.log('World')
	})

	// it('delay 1', async () => {
	// 	await new Promise(r => setTimeout(r, 1000))
	// })

	// it('delay 2', async () => {
	// 	await new Promise(r => setTimeout(r, 1000))
	// })

	it('error', async () => {
		throw new Error('Random Error')
	})
})
