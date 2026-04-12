describe('Test', () => {
	it('Type error super duper duper duper duper duper duper duper duper duper duper duper  duper duper duper duper duper duper duper', async () => {
		console.log('TEST')
		// await new Promise(resolve => setTimeout(resolve, 4000))
		// const i: number = 'string'
		expectTypeOf(1).toEqualTypeOf<string>()
		expect(1).toBeTypeOf('object')
		console.log('test 1')
		throw new Error()
	})

	it('Type error super duper duper duper duper duper duper duper duper duper duper duper  duper duper duper duper duper duper duper', async () => {
		// console.log('TEST');

		await new Promise(resolve => setTimeout(resolve, 4000))

		// const i: number = 'string'

		// expectTypeOf(1).toEqualTypeOf<string>()
		// expect(1).toBeTypeOf('object')

		// console.log('test 1')

		// throw new Error()
	})
})
