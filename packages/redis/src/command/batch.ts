import { Command, InputValue, RedisClient } from '../type'

type BatchResponse<T extends Command<any, any>[]> = {
	[K in keyof T]: ReturnType<T[K]['resolve']>
}

const runBatch = async (client: RedisClient, commands: { name: string; args: (InputValue | undefined)[] }[]) => {
	const response = await client.batch(commands)

	if (response === null) {
		throw new Error('Invalid batch response')
	}

	return response.map(([error, data]) => {
		if (error) {
			throw error
		}

		return data
	})
}

/**
 * Execute multiple commands with a Redis pipeline.
 *
 * @complexity Depends on the commands in the batch
 * @speed depends on commands
 * @since n/a
 */
export const batch = async <const T extends Command<any, any>[]>(
	client: RedisClient,
	commands: T
): Promise<BatchResponse<T>> => {
	// ------------------------------------------------
	// Preload the script into redis memory when a
	// script is being batched. This will remove the
	// need to retry and check if the script was
	// already preloaded.

	const preloadScriptCommands = Array.from(
		new Set(commands.map(c => c.preloadScript).filter(v => typeof v === 'string'))
	).map(script => ({
		name: 'SCRIPT',
		args: ['LOAD', script],
	}))

	// ------------------------------------------------
	// Run the batch

	const response = await runBatch(client, [...preloadScriptCommands, ...commands])

	// ------------------------------------------------
	// Remove the preload script responses

	return response.slice(preloadScriptCommands.length).map((data, i) => {
		const command = commands[i]

		if (!command) {
			throw new Error(`Invalid batch index [${i}] response`)
		}

		return command.resolve(data)
	}) as BatchResponse<T>
}
