import { createHash } from 'node:crypto'
import { Command, InputValue, RedisClient } from '../type'
import { command, returnEcho, returnNumberBoolean, returnVoid } from './util'

/**
 * Execute a Lua script directly.
 *
 * @command EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
const evaluate = (client: RedisClient, script: string, keys: string[], args: InputValue[]) => {
	return command(client, 'EVAL', [script, keys.length, ...keys, ...args], returnEcho)
}

export { evaluate as eval }

/**
 * Execute a Lua script by SHA hash.
 *
 * @command EVALSHA
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
export const evalSha = (client: RedisClient, hash: string, keys: string[], args: InputValue[]) => {
	return command(client, 'EVALSHA', [hash, keys.length, ...keys, ...args], returnEcho)
}

/**
 * Load a Lua script into the script cache.
 *
 * @command SCRIPT LOAD
 * @complexity O(N) where N is the length in bytes of the script body
 * @speed slow
 * @since 2.6.0
 */
export const load = (client: RedisClient, script: string) => {
	return command<string, string>(client, 'SCRIPT', ['LOAD', script], returnEcho)
}

/**
 * Check whether one or more scripts exist in the script cache.
 *
 * @command SCRIPT EXISTS
 * @complexity O(N) where N is the number of SHA1 digests to check
 * @speed slow
 * @since 2.6.0
 */
export const exists = (client: RedisClient, ...hashes: [string, ...string[]]) => {
	return command<boolean[], Array<number | string>>(client, 'SCRIPT', ['EXISTS', ...hashes], r =>
		r.map(returnNumberBoolean)
	)
}

/**
 * Flush the script cache.
 *
 * @command SCRIPT FLUSH
 * @complexity O(N) where N is the number of cached scripts
 * @speed slow
 * @since 2.6.0
 */
export const flush = (client: RedisClient, mode: 'sync' | 'async' = 'sync') => {
	return command<void, string>(client, 'SCRIPT', ['FLUSH', mode.toUpperCase()], returnVoid)
}

const createScriptRunner = (script: string, keyNum: number = 0) => {
	let hash: string | undefined

	const sha = () => {
		if (!hash) {
			hash = createHash('sha1').update(script).digest('hex')
		}

		return hash
	}

	return <I extends InputValue[], O extends string | string[]>(
		client: RedisClient,
		...args: I
	): Command<O, unknown> => {
		let promise: Promise<O> | undefined

		const run = async () => {
			let result
			try {
				// result = await evalSha(client, sha(), [], args)
				result = await command(client, 'EVALSHA', [sha(), keyNum, ...args], returnEcho)
			} catch (error) {
				if (error instanceof Error && error.message.includes('NOSCRIPT')) {
					result = await command(client, 'EVAL', [script, keyNum, ...args], returnEcho)
				} else {
					throw error
				}
			}

			return result as O
		}

		return {
			name: 'EVALSHA',
			args: [sha(), keyNum, ...args],
			resolve: returnEcho as any,
			preloadScript: script,
			then(onfulfilled, onrejected) {
				if (!promise) {
					promise = run()
				}

				return promise.then(onfulfilled).catch(onrejected)
			},
		}
	}
}

/**
 * Define a reusable typed Lua script runner.
 *
 * @command EVALSHA | EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
export const define = <I extends InputValue[], O extends string | string[]>({
	script,
	keys = 0,
}: {
	script: string
	keys?: number
}) => {
	const run = createScriptRunner(script, keys)

	return (client: RedisClient, ...args: I) => {
		return run<I, O>(client, ...args)
	}
}

/**
 * Define a reusable Lua script with template literal arguments.
 *
 * @command EVALSHA | EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
export const lua = (strings: TemplateStringsArray, ...args: InputValue[]) => {
	const script = String.raw({ raw: strings }, ...args.map((_, i) => `ARGV[${i + 1}]`))
	const run = createScriptRunner(script)

	return <T extends string | string[]>(client: RedisClient) => {
		return run<any, T>(client, ...args)
	}
}
