
import { requestPort } from '@heat/request-port'
import { mockClient } from './client';
import { download } from './server/download';
import { launch } from './server/launch';
import { wait } from './server/wait';
import { VERSION_8_8_0, VersionArgs } from './server/version';

type Options = {
	version?: VersionArgs
	debug?: boolean
}

export const mockOpenSearch = ({ version = VERSION_8_8_0, debug = false }: Options = {}) => {
	beforeAll && beforeAll(async () => {
		const [ port, release ] = await requestPort()

		const host = 'localhost'
		const path = await download(version.version)
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
	}, 100 * 1000)
}
