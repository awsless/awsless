import { Client } from "@opensearch-project/opensearch"
import { launch } from "../src/server/launch"
import { VERSION_2_8_0 } from "../src/server/version"
import { download } from "../src/server/download"

describe('Download', () => {

	let kill:() => void

	const version = VERSION_2_8_0
	const port = 55700
	const host = 'localhost'

	afterAll(async () => {
		await kill?.()
	}, 30 * 1000)

	it('launch', async () => {
		const path = await download(version.version)
		kill = await launch({
			path,
			port,
			host,
			debug: true,
			version,
		})
	}, 100 * 1000)

	it('client', async () => {
		const client = new Client({ node: `http://${host}:${port}` })
		const result = await client.cat.indices({ format: 'json' })
		expect(result.body).toStrictEqual([])
	}, 50 * 1000)
})
