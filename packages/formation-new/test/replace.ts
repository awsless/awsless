import { App, Stack } from '../src'
import { requiresReplacement } from '../src/formation/workspace/replacement'
import { createMockWorkSpace, Resource } from './_mock'

describe('replace resource', () => {
	const { workspace, resetTest, assertResourceExists, assertResourceNotExists } = createMockWorkSpace()

	it('step 1 - create resource 1', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r1', { id: '1' })

		await workspace.deploy(app)

		assertResourceExists('1')
	})

	it('step 2 - throw when updating immutable field', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(stack, 'r1', { id: '2' })

		await expect(workspace.deploy(app)).rejects.toThrow()

		assertResourceExists('1')
		assertResourceNotExists('2')
	})

	it('step 3 - allow replacing immutable field', async () => {
		const app = new App('app')
		const stack = new Stack(app, 'stack')

		new Resource(
			stack,
			'r1',
			{ id: '2' },
			{
				replaceOnChanges: ['id'],
			}
		)

		await workspace.deploy(app)

		assertResourceExists('2')
		assertResourceNotExists('1')
	})

	describe('replace with dependencies', () => {
		resetTest()

		it('step 1 - dependend resources', async () => {
			const app = new App('app')
			const stack = new Stack(app, 'stack')

			const r1 = new Resource(stack, 'r1', { id: '1' })
			new Resource(stack, 'r2', { id: '2', deps: [r1.id] })

			await workspace.deploy(app)

			assertResourceExists('1')
			assertResourceExists('2')
		})

		it('step 2 - throw when replacing resource with dependencies', async () => {
			const app = new App('app')
			const stack = new Stack(app, 'stack')

			const r1 = new Resource(
				stack,
				'r1',
				{ id: '3' },
				{
					replaceOnChanges: ['id'],
				}
			)
			new Resource(stack, 'r2', { id: '2', deps: [r1.id] })

			await expect(workspace.deploy(app)).rejects.toThrow()
		})
	})

	describe('requiresReplacement util', () => {
		const left = {
			id: 1,
			key: 1,
			list: [{ key: 1 }, { key: 2 }],
		}

		const right = {
			id: 1,
			key: 2,
			list: [{ key: 1 }, { key: 3 }],
		}

		it('valid replacements', () => {
			const valid = [
				// valid
				['key'],
				['list[1].key'],
				['list.1.key'],
				['list.*.key'],
				['key', 'unknown'],
			]

			for (const paths of valid) {
				expect(requiresReplacement(left, right, paths)).toBe(true)
			}
		})

		it('invalid replacements', () => {
			const invalid = [
				// invalid
				['id'],
				['unknown'],
				['list[0].key'],
				['list[999].key'],
			]

			for (const paths of invalid) {
				expect(requiresReplacement(left, right, paths)).toBe(false)
			}
		})
	})
})
