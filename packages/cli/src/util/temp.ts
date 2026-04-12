import { mkdir, readdir, rm } from 'fs/promises'
import { join } from 'path'
import { directories } from './path'

export const createTempFolder = async (name: string) => {
	const path = join(directories.temp, name)

	await mkdir(join(directories.temp, name), { recursive: true })

	process.on('SIGTERM', async () => {
		await rm(path, { recursive: true })
	})

	return {
		path,
		async files() {
			return readdir(path, { recursive: true })
		},
		async delete() {
			await rm(path, { recursive: true })
		},
	}
}
