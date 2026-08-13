import { App, Resource, Stack } from '../src'

describe('Node', () => {
	class Record extends Resource {
		readonly cloudProviderId = 'record'

		constructor(
			readonly parent: Resource | Stack,
			id: string,
			props?: unknown
		) {
			super(parent, 'Record', id, props)
		}

		get value() {
			return this.output<string>(() => 'id')
		}

		toState() {
			return {}
		}
	}

	it('should link parental & child relationships', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')
		const parent = new Record(stack, 'parent')
		const child = new Record(parent, 'child')

		expect(app.urn).toBe('urn:App:{app}')
		expect(app.parent).toBeUndefined()
		expect(app.children).toStrictEqual([stack])
		expect(app.stacks).toStrictEqual([stack])

		expect(stack.urn).toBe('urn:App:{app}:Stack:{stack}')
		expect(stack.parent).toStrictEqual(app)
		expect(stack.children).toStrictEqual([parent])
		expect(stack.resources).toStrictEqual([parent, child])

		expect(parent.urn).toBe('urn:App:{app}:Stack:{stack}:Record:{parent}')
		expect(parent.parent).toStrictEqual(stack)
		expect(parent.children).toStrictEqual([child])

		expect(child.urn).toBe('urn:App:{app}:Stack:{stack}:Record:{parent}:Record:{child}')
		expect(child.parent).toStrictEqual(parent)
		expect(child.children).toStrictEqual([])
	})

	it('should link depenencies between resources & stacks', async () => {
		const app = new App('app')

		const stack1 = new Stack(app, 'stack-1')
		const parent = new Record(stack1, 'parent')
		const child = new Record(parent, 'child', {
			prop: parent.value,
		})

		const stack2 = new Stack(app, 'stack-2')
		const other = new Record(stack2, 'other', {
			prop: child.value,
		})

		expect(stack1.dependencies).toStrictEqual(new Set([]))
		expect(stack2.dependencies).toStrictEqual(new Set([stack1]))

		expect(parent.dependencies).toStrictEqual(new Set([]))
		expect(child.dependencies).toStrictEqual(new Set([parent]))
		expect(other.dependencies).toStrictEqual(new Set([]))
	})

	it('should propagate tags between node children', async () => {
		const app = new App('app')
		app.setTag('app', '1')

		const stack = new Stack(app, 'stack')
		stack.setTag('stack', '2')

		const parent = new Record(stack, 'parent')
		parent.setTag('parent', '3')

		const child = new Record(parent, 'child', {
			tags: {
				child: '4',
			},
		})

		expect(app.tags).toStrictEqual({ app: '1' })
		expect(stack.tags).toStrictEqual({ app: '1', stack: '2' })
		expect(parent.tags).toStrictEqual({ app: '1', stack: '2', parent: '3' })
		expect(child.tags).toStrictEqual({ app: '1', stack: '2', parent: '3', child: '4' })
	})
})
