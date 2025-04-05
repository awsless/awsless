import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createDebugger } from '../../debug.ts'
import { URN } from '../../resource.ts'
import { AppState } from '../../workspace/state.ts'
import { StateBackend } from '../state.ts'

const debug = createDebugger('State')

export class FileStateBackend implements StateBackend {
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
		debug('get')

		let json

		try {
			json = await readFile(join(this.stateFile(urn)), 'utf8')
		} catch (error) {
			return
		}

		return JSON.parse(json) as AppState
	}

	async update(urn: URN, state: AppState) {
		debug('update')
		await this.mkdir()
		await writeFile(this.stateFile(urn), JSON.stringify(state, undefined, 2))
	}

	async delete(urn: URN) {
		debug('delete')
		await this.mkdir()
		await rm(this.stateFile(urn))
	}
}
