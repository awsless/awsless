describe('Test', () => {
	it('Type error', () => {
		const i: number = 'string'

		expectTypeOf(1).toEqualTypeOf<string>()
		// expect(1).toBeTypeOf('object')

		console.log('test 1')

		// throw new Error()
	})
})
