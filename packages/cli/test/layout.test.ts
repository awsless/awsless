import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { layout } from '../src/cli/ui/complex/layout'

vi.mock('../src/cli/program', () => ({
	program: { optsWithGlobals: () => ({}) },
}))

vi.mock('../src/config/load/load', () => ({
	loadAppConfig: async () => ({ name: 'app', region: 'us-east-1', profile: 'test' }),
	loadStackConfigs: async () => [],
}))

vi.mock('../src/feature/validate', () => ({ validateFeatures: () => {} }))
vi.mock('../src/util/sound', () => ({ playErrorSound: () => {} }))
vi.mock('../src/cli/ui/app', () => ({ logApp: () => {} }))
vi.mock('../src/cli/ui/error/error', () => ({ logError: () => {} }))

vi.mock('@awsless/clui', async importOriginal => {
	const mod = await importOriginal<typeof import('@awsless/clui')>()

	return { ...mod, log: { ...mod.log, intro: () => {}, outro: () => {} } }
})

describe('layout exit codes', () => {
	const listeners = process.listeners('exit')
	let exit: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		process.exitCode = undefined
		// The real exit would end the test run, so the calls are only
		// recorded & the process keeps going.
		exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
	})

	afterEach(() => {
		for (const listener of process.listeners('exit')) {
			if (!listeners.includes(listener)) {
				process.off('exit', listener)
			}
		}

		vi.restoreAllMocks()
		process.exitCode = undefined
	})

	it('should exit with zero once the command completes', async () => {
		await layout('test', async () => 'done')

		expect(exit).toHaveBeenCalledWith(0)

		process.emit('exit', 0)

		expect(process.exitCode).toBeUndefined()
	})

	it('should pass the exit code of a handed over command through', async () => {
		await layout('test', async ({ exit }) => {
			exit(3)
		})

		expect(exit.mock.calls[0]).toEqual([3])

		process.emit('exit', 3)

		expect(process.exitCode).toBeUndefined()
	})

	it('should exit with one when the command fails', async () => {
		await layout('test', async () => {
			throw new Error('boom')
		})

		expect(exit).toHaveBeenCalledWith(1)
	})

	it('should turn the zero exit of an interrupted prompt into 130', async () => {
		// A raw mode ctrl-c makes the prompt library exit(0) mid-command,
		// so the command never reaches its end.
		const exitLikeThePrompt = process.exit as (code: number) => void

		void layout('test', async () => {
			exitLikeThePrompt(0)
			await new Promise(() => {})
		})

		await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0))

		process.emit('exit', 0)

		expect(process.exitCode).toBe(130)
	})
})
