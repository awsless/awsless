import { requestPort } from '@heat/request-port'
import { mockClient } from './client'
import { download } from './server/download'
import { downloadJdk } from './server/jdk'
import { launch } from './server/launch'
import { VERSION_2_8_0, VersionArgs } from './server/version'
import { wait } from './server/wait'

type Options = {
	version?: VersionArgs
	debug?: boolean
}

export const mockOpenSearch = ({ version = VERSION_2_8_0, debug = false }: Options = {}) => {
	beforeAll &&
		beforeAll(async () => {
			const [port, release] = await requestPort()

			const host = 'localhost'
			const path = await download(version.version)

			// The bundle only ships a linux or windows jdk, so on other
			// platforms a matching jdk is downloaded next to it.
			const native = process.platform === 'linux' || process.platform === 'win32'
			const javaHome = native ? undefined : await downloadJdk()

			const kill = await launch({
				path,
				port,
				host,
				version,
				debug,
				javaHome,
			})

			mockClient(host, port)

			await wait()

			return async () => {
				await kill()
				await release()
			}
		}, 1000 * 1000)
}
