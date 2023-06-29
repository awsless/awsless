import { requestPort } from '@heat/request-port'
import { VERSION_8_0_32, VersionArgs } from './server/version'
import { download } from './server/download'
import { launch } from './server/launch'
import { wait } from './server/wait'
import { overrideOptions } from './client'
import { migrate } from './commands'

type Options = {
	migrations?: Record<string, string>
	version?: VersionArgs
	debug?: boolean
}

export const mockMysql = ({ migrations, version = VERSION_8_0_32, debug = false }: Options = {}) => {
	let kill: () => Promise<void>
	let releasePort: () => Promise<void>

	beforeAll &&
		beforeAll(async () => {
			const [port, release] = await requestPort()
			releasePort = release

			const host = 'localhost'
			const path = await download(version.version)
			kill = await launch({
				path,
				port,
				host,
				version,
				debug,
			})

			overrideOptions({
				port,
				host,
				user: 'root',
				password: undefined,
			})

			await wait()

			if (migrations) {
				await migrate(migrations)
			}
		}, 60 * 1000)

	afterAll &&
		afterAll(async () => {
			await kill?.()
			await releasePort?.()
		})
}
