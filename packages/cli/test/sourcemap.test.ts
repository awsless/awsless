import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it, vi } from 'vitest'
import { createSymbolicator } from '../src/feature/on-error-log/server/sourcemap'

// The fixture is a real rolldown minified build of:
//
//   src/tasks/create.ts
//     const registry = {}
//     export const createTask = (payload) => {
//       let applyLimit = registry[payload.name]
//       if (payload.name.length > 100) { applyLimit = () => 0 }
//       return applyLimit(payload)          // line 12
//     }
//
//   entry.ts
//     export default () => createTask({ name: 'x' })   // line 3
//
// Calling it really throws "n is not a function" with the frames below.
const map = readFileSync(join(__dirname, '_fixture/sourcemap/index.mjs.map'), 'utf8')

const PREFIX = 'sourcemaps/test-app--function--bundle/abc123/'

const STACK = [
	'TypeError: n is not a function',
	'    at t (file:///var/task/index.mjs:1:70)',
	'    at n (file:///var/task/index.mjs:1:86)',
	'    at Runtime.handleOnceNonStreaming (file:///var/runtime/index.mjs:1234:29)',
]

const create = (overrides?: { prefix?: string | undefined; map?: string | undefined }) => {
	const loadPrefix = vi.fn(async () => (overrides && 'prefix' in overrides ? overrides.prefix : PREFIX))
	const loadMap = vi.fn(async (key: string) => {
		if (overrides && 'map' in overrides) {
			return overrides.map
		}

		return key === `${PREFIX}index.mjs.map` ? map : undefined
	})

	return { symbolicate: createSymbolicator({ loadPrefix, loadMap }), loadPrefix, loadMap }
}

const error = {
	functionName: 'test-app--function--bundle',
	version: '42',
	message: 'n is not a function',
	stackTrace: STACK,
}

describe('sourcemap symbolication', () => {
	it('maps minified frames back to the original source', async () => {
		const { symbolicate } = create()
		const result = await symbolicate(error)

		expect(result.stackTrace).toStrictEqual([
			'TypeError: applyLimit is not a function',
			'    at createTask (src/tasks/create.ts:12:9)',
			'    at n (entry.ts:3:22)',
			'    at Runtime.handleOnceNonStreaming (file:///var/runtime/index.mjs:1234:29)',
		])
	})

	it('rewrites minified identifiers in templated error messages', async () => {
		const { symbolicate } = create()
		const result = await symbolicate(error)

		expect(result.message).toBe('applyLimit is not a function')
	})

	it('leaves non-templated messages untouched', async () => {
		const { symbolicate } = create()
		const result = await symbolicate({ ...error, message: 'The task limit of 25 is reached.' })

		expect(result.message).toBe('The task limit of 25 is reached.')
		expect(result.stackTrace?.[1]).toBe('    at createTask (src/tasks/create.ts:12:9)')
	})

	it('passes through when the version has no sourcemap prefix', async () => {
		const { symbolicate } = create({ prefix: undefined })
		const result = await symbolicate(error)

		expect(result.message).toBe(error.message)
		expect(result.stackTrace).toStrictEqual(STACK)
	})

	it('passes through frames whose map is missing', async () => {
		const { symbolicate } = create({ map: undefined })
		const result = await symbolicate(error)

		expect(result.message).toBe(error.message)
		expect(result.stackTrace).toStrictEqual(STACK)
	})

	it('passes through on a corrupt map', async () => {
		const { symbolicate } = create({ map: 'not json' })
		const result = await symbolicate(error)

		expect(result.stackTrace).toStrictEqual(STACK)
	})

	it('fetches the prefix & map once across errors of the same version', async () => {
		const { symbolicate, loadPrefix, loadMap } = create()

		await symbolicate(error)
		await symbolicate(error)

		expect(loadPrefix).toHaveBeenCalledTimes(1)
		expect(loadMap).toHaveBeenCalledTimes(1)
	})

	it('handles frames without an enclosing function name', async () => {
		const { symbolicate } = create()
		const result = await symbolicate({
			...error,
			stackTrace: ['    at /var/task/index.mjs:1:86'],
		})

		// The frame maps by position & takes its name from... nothing:
		// there is no frame below to name it.
		expect(result.stackTrace).toStrictEqual(['    at entry.ts:3:22'])
	})

	it('retries after a transient loader failure instead of caching it', async () => {
		let fail = true
		const loadPrefix = vi.fn(async () => {
			if (fail) {
				throw new Error('ThrottlingException')
			}

			return PREFIX
		})
		const loadMap = vi.fn(async () => map)
		const symbolicate = createSymbolicator({ loadPrefix, loadMap })

		// The throttled lookup delivers the raw error...
		const first = await symbolicate(error)
		expect(first.stackTrace).toStrictEqual(STACK)

		// ...and the next error retries instead of staying broken.
		fail = false
		const second = await symbolicate(error)
		expect(second.stackTrace?.[1]).toBe('    at createTask (src/tasks/create.ts:12:9)')
		expect(loadPrefix).toHaveBeenCalledTimes(2)
	})

	it('never rewrites the message from a non-throw-site frame', async () => {
		const { symbolicate } = create()

		// The first frame is unmappable (its map is missing), so the token
		// of a later frame must never rewrite the message - it names some
		// caller, not what the engine complained about.
		const result = await symbolicate({
			...error,
			stackTrace: [
				'TypeError: n is not a function',
				'    at wrapped (file:///var/task/other-chunk.mjs:1:10)',
				'    at t (file:///var/task/index.mjs:1:70)',
			],
		})

		expect(result.message).toBe('n is not a function')
	})
})
