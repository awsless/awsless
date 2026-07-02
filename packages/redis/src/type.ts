export type InputValue = number | string

export type RedisCommandOptions = {
	readonly?: boolean
}

export type RedisCommand = {
	name: string
	args: (InputValue | undefined)[]
	options?: RedisCommandOptions
}

export type RedisClient = {
	send: <T = any>(name: string, args: (InputValue | undefined)[], options?: RedisCommandOptions) => Promise<T>
	batch: <T = any[]>(commands: RedisCommand[]) => Promise<T>
	transact: <T = any[]>(commands: RedisCommand[]) => Promise<T>

	destroy(): Promise<void>
}

export type Command<T, R> = RedisCommand & {
	preloadScript?: string
	resolve: (response: R) => T
	then<Result1 = T, Result2 = never>(
		onfulfilled: (value: T) => Result1,
		onrejected?: (reason: any) => Result2
	): Promise<Result1 | Result2>
}
