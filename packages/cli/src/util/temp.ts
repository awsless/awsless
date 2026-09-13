import { mkdir, mkdtemp, readdir, rm } from 'fs/promises'
import { join } from 'path'
import { directories } from './path.js'

export const createTempFolder = async (name: string) => {
	await mkdir(directories.temp, { recursive: true })
	// Concurrent builds must never share or delete each other's workspace.
	const path = await mkdtemp(join(directories.temp, `${name}-`))

	return {
		path,
		async files() {
			return readdir(path, { recursive: true })
		},
		async delete() {
			await rm(path, { recursive: true, force: true })
		},
		async [Symbol.asyncDispose]() {
			await this.delete()
		},
	}
}
