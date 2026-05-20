export type InputValue = number | string

export type RedisClient = {
	send: <T = any>(name: string, args: (InputValue | undefined)[]) => Promise<T>
	batch: <T = any[]>(commands: { name: string; args: (InputValue | undefined)[] }[]) => Promise<T>
	transact: <T = any[]>(commands: { name: string; args: (InputValue | undefined)[] }[]) => Promise<T>

	destroy(): Promise<void>
}

export type Command<T, R> = {
	preloadScript?: string
	name: string
	args: (InputValue | undefined)[]
	resolve: (response: R) => T
	then<Result1 = T, Result2 = never>(
		onfulfilled: (value: T) => Result1,
		onrejected?: (reason: any) => Result2
	): Promise<Result1 | Result2>
}
