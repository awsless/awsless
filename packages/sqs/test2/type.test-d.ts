
describe('Type Check', () => {

	it('sqsStruct', () => {
		assertType<string>(1)
		expectTypeOf(1).toEqualTypeOf<string>()
	})
})
