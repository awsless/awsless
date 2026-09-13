import type { StackConfig } from '../config/stack.js'
import type { TypeGenContext } from '../feature.js'
import { TypeFile } from './file.js'
import { TypeObject } from './object.js'

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

type AddResource = (name: string, type: string, mock: string) => void

// Every mockable resource feature emits the same file shape, so a
// feature only declares the type & mock entry per resource.
export const writeResourceTypes = async (
	ctx: TypeGenContext,
	props: {
		kind: string
		interfaceName: string
		code: string
		// Stack resources nest under their stack name, app resources are flat.
		stacks?: (stack: StackConfig, add: AddResource, types: TypeFile) => void
		app?: (add: AddResource, types: TypeFile) => void
	}
) => {
	const types = new TypeFile('awsless')
	const resources = new TypeObject(1)
	const testMocks = new TypeObject(2)

	if (props.stacks) {
		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const testMock = new TypeObject(3)

			props.stacks(
				stack,
				(name, type, mock) => {
					resource.addType(name, type)
					testMock.addType(name, mock)
				},
				types
			)

			resources.addType(stack.name, resource)
			testMocks.addType(stack.name, testMock)
		}
	}

	props.app?.((name, type, mock) => {
		resources.addType(name, type)
		testMocks.addType(name, mock)
	}, types)

	const testMock = new TypeObject(1)
	testMock.addType(props.kind, testMocks)

	types.addCode(props.code)
	types.addInterface(props.interfaceName, resources)
	types.addInterface('TestMock', testMock)

	await ctx.write(`${props.kind}.d.ts`, types, true)
}
