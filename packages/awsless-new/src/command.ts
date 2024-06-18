import minimist, { ParsedArgs } from 'minimist'
import { Region } from './config/schema/region.js'
import { ExpectedError } from './error.js'
import { Credentials } from './util/aws.js'

export type Command = {
	name: string
	file: string
	handler: string
	description?: string
}

export type CommandContext = {
	region: Region
	credentials: Credentials
	accountId: string
	update: (msg: string) => void
}

export type CommandHandler = (options: CommandOptions, context: CommandContext) => Promise<string | undefined | void>

export class CommandOptions {
	private opts: ParsedArgs

	constructor(args: string[]) {
		this.opts = minimist(args)
	}

	get(name: string) {
		if (name in this.opts) {
			return this.opts[name]
		}

		throw new ExpectedError(`CLI option "${name}" not found`)
	}

	private getAssertType<T extends 'string' | 'number' | 'boolean'>(name: string, type: T) {
		const value = this.get(name)

		if (typeof value === type) {
			return value
		}

		throw new ExpectedError(`CLI option "${name}" isn't a ${type} type`)
	}

	number(name: string): number {
		return this.getAssertType(name, 'number')
	}

	string(name: string): string {
		return this.getAssertType(name, 'string')
	}

	boolean(name: string): boolean {
		return this.getAssertType(name, 'boolean')
	}
}
