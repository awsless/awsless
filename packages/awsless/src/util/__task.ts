import chalk from "chalk"
import { debug } from "../cli/logger"

export type Event = 'build' | 'publish-asset'
export type Callback = () => Promise<void> | void

export class Tasks {
	private list: Record<Event, Callback[]> = {
		build: [],
		'publish-asset': [],
	}

	add(event:Event, callback:Callback) {
		this.list[event].push(callback)
	}

	async run(event:Event) {
		debug(`Run the ${chalk.blue(event)} task`)


		const result = await Promise.all(
			this.list[event].map(callback => callback())
		)

		debug(`Finished the ${chalk.blue(event)} task`)

		return result
	}
}
