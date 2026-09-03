// The type snippets shared by the generated resource typings.

export const funcType = `type Func = (...args: any[]) => any`

// The invoke signature pair of a handler: the payload turns optional
// when the handler declares none.
export const invokeTypes = (props: {
	returns: string
	options?: string
	// Adds the cached invoke member, with the same payload optionality.
	cached?: boolean
}) => {
	const options = props.options ? `, options?: ${props.options}` : ''
	const cached = (payload: string) => {
		return props.cached ? `\n\treadonly cached: (${payload}${options}) => ${props.returns}` : ''
	}

	return `
type Invoke<N extends string, F extends Func> = Parameters<F> extends []
	? InvokeWithoutPayload<N, F>
	: unknown extends Parameters<F>[0]
		? InvokeWithoutPayload<N, F>
		: InvokeWithPayload<N, F>

type InvokeWithPayload<Name extends string, F extends Func> = {
	readonly name: Name${cached('payload: Parameters<F>[0]')}
	(payload: Parameters<F>[0]${options}): ${props.returns}
}

type InvokeWithoutPayload<Name extends string, F extends Func> = {
	readonly name: Name${cached('payload?: Parameters<F>[0]')}
	(payload?: Parameters<F>[0]${options}): ${props.returns}
}
`
}

// The test mock entry of a typed handler. Calling overrides the
// implementation & the same value works as the vitest mock inside
// expect().
export const testMockTypes = (
	props: {
		// What the mock handle may return.
		handle?: string
		// What the mock builder accepts besides a handle.
		accepts?: string
		// Extra members on the entry, like a second spy.
		members?: string
	} = {}
) => {
	return `
type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => ${props.handle ?? 'void | Promise<void>'}
type MockBuilder<F extends Func> = (handle?: MockHandle<F>${props.accepts ? ` | ${props.accepts}` : ''}) => void
type MockObject<F extends Func> = Mock<(...args: Parameters<F>) => ReturnType<F>>
type TestMockEntry<F extends Func> = MockBuilder<F> & MockObject<F>${props.members ? ` & { ${props.members} }` : ''}
`
}

// The test mock entry of an untyped publisher.
export const plainTestMockTypes = (payload = 'unknown') => {
	return `
type MockHandle = (payload: ${payload}) => void
type MockBuilder = (handle?: MockHandle) => void
type TestMockEntry = MockBuilder & Mock<(payload: unknown) => unknown>
`
}
