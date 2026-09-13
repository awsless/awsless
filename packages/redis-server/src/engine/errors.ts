// Thrown by command handlers and turned into a RESP error reply at the edge.
// The message is sent verbatim, so it must carry the redis error prefix.
export class RedisError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'RedisError'
	}
}

export const wrongType = () => new RedisError('WRONGTYPE Operation against a key holding the wrong kind of value')
export const syntaxError = () => new RedisError('ERR syntax error')
export const notInteger = () => new RedisError('ERR value is not an integer or out of range')
export const notFloat = () => new RedisError('ERR value is not a valid float')
export const arityError = (name: string) =>
	new RedisError(`ERR wrong number of arguments for '${name.toLowerCase()}' command`)
export const unsupported = (what: string) => new RedisError(`ERR the local redis server does not support ${what}`)
export const unknownSubcommand = (sub: string, container: string) =>
	new RedisError(`ERR unknown subcommand '${sub}'. Try ${container.toUpperCase()} HELP.`)
