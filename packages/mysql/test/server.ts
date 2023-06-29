import { VERSION_8_0_32 } from '../src/server/version'
import { download } from '../src/server/download'
import { launch } from '../src/server/launch'
import { mysqlClient } from '../src'

describe(
	'Test MySQL Server',
	() => {
		let kill: () => void
		let path: string

		const version = VERSION_8_0_32
		const port = 55700
		const host = 'localhost'

		afterAll(async () => {
			await kill?.()
		}, 30 * 1000)

		it('should download & unpack the mysql binary', async () => {
			path = await download(version.version)
		})

		it('should launch mysql', async () => {
			kill = await launch({
				path,
				host,
				port,
				version,
				debug: false,
			})
		})

		it('should ping with the client', async () => {
			const client = mysqlClient({ port, host, user: 'root' })
			const result = await client.introspection.getSchemas()
			expect(result).toStrictEqual([
				{ name: 'mysql' },
				{ name: 'information_schema' },
				{ name: 'performance_schema' },
				{ name: 'sys' },
			])
		})
	},
	120 * 1000
)
