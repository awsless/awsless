import { Region } from './config/schema/region.js'
import { Credentials } from './util/aws.js'

// export type Option = {
// 	name: string
// 	description?: string
// 	default?: unknown
// }

// export type Argument = {
// 	name: string
// 	description?: string
// 	default?: unknown
// }

export type Command = {
	name: string
	file: string
	handler: string
	description?: string
	// arguments: Argument[]
	// options: Option[]
}

export type CommandOptions = Record<string, string | number | boolean | undefined>
export type CommandContext = {
	region: Region
	credentials: Credentials
	accountId: string
	update: (msg: string) => void
}

export type CommandHandler = (options: CommandOptions, context: CommandContext) => Promise<string | undefined | void>
