import { requestPort } from '@heat/request-port'
import { mockClient } from './client'
import { download } from './server/download'
import { launch } from './server/launch'
import { VERSION_3_5_0_MIN, VersionArgs } from './server/version'
import { wait } from './server/wait'

type Options = {
	version?: VersionArgs
	debug?: boolean
}

export const mockOpenSearch = ({ version = VERSION_3_5_0_MIN, debug = false }: Options = {}) => {
	beforeAll &&
		beforeAll(async () => {
			const [port, release] = await requestPort()

			const host = 'localhost'
			const path = await download(version)
			const kill = await launch({
				path,
				port,
				host,
				version,
				debug,
			})

			mockClient(host, port)

			await wait()

			return async () => {
				await kill()
				await release()
			}
		}, 1000 * 1000)
}
