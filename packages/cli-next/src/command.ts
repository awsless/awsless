import { Region } from './config/schema/region.js'
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
}

export type CommandHandler = (context: CommandContext) => Promise<void>
