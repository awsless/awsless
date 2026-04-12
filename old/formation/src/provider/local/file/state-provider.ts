import { join } from 'path'
import { URN } from '../../../core/resource'
import { AppState, StateProvider as Provider } from '../../../core/state'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'

export class StateProvider implements Provider {
	constructor(
		private props: {
			dir: string
		}
	) {}

	private stateFile(urn: URN) {
		return join(this.props.dir, `${urn}.json`)
	}

	private async mkdir() {
		await mkdir(this.props.dir, {
			recursive: true,
		})
	}

	async get(urn: URN) {
		let json

		try {
			json = await readFile(join(this.stateFile(urn)), 'utf8')
		} catch (error) {
			return
		}

		return JSON.parse(json) as AppState
	}

	async update(urn: URN, state: AppState) {
		await this.mkdir()
		await writeFile(this.stateFile(urn), JSON.stringify(state, undefined, 2))
	}

	async delete(urn: URN) {
		await this.mkdir()
		await rm(this.stateFile(urn))
	}
}
