import { Client } from "@opensearch-project/opensearch/."
import { download } from "../src/server/download"
import { launch } from "../src/server/launch"
import { VERSION_7_7_1 } from "../src/server/version"
// import { wait } from "../src/server/wait"

describe('Download', () => {

	let kill:() => void

	// const version = '8.8.0'
	// const version = '7.7.1'
	const version = VERSION_7_7_1
	const port = 55700
	const host = 'localhost'

	afterAll(async () => {
		await kill?.()
	})

	it('download', async () => {
		await download(version.version)
	}, 50 * 1000)

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

	// it('wait', async () => {
	// 	const client = new Client({ node: `http://${host}:${port}` })
	// 	await wait(client)
	// }, 50 * 1000)

	it('fetch', async () => {
		const response = await fetch(`http://${host}:${port}/_cat/indices`, {
			method: 'GET',
			headers: {
				'content-type': 'application/json'
			}
		})

		console.log(response.status);

		const body = await response.text()

		console.log(body);
		console.log(JSON.parse(body));

		// console.log(await response.text());
		// console.log(await response.json());

	}, 50 * 1000)

	// it('client', async () => {
	// 	const client = new Client({
	// 		node: `http://${host}:${port}`,
	// 	})

	// 	const result = await client.cat.indices({ format: 'json' })

	// 	console.log(result);
	// }, 50 * 1000)
})
