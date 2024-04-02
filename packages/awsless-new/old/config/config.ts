import { Credentials } from '../util/credentials.js'
import { AppConfig } from './app.js'
import { StackConfig } from './stack.js'

export type Config = {
	app: AppConfig
	stage: string
	stacks: StackConfig[]
	account: string
	credentials: Credentials
}
