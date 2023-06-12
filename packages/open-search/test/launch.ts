import { Client } from "@opensearch-project/opensearch"
import { launch } from "../src/server/launch"
import { VERSION_2_8_0 } from "../src/server/version"

describe('Download', () => {

	let kill:() => void

	// const version = '8.8.0'
	// const version = '7.7.1'
	// const version = VERSION_7_7_1
	const version = VERSION_2_8_0
	const port = 55700
	const host = 'localhost'

	afterAll(async () => {
		await kill?.()
	}, 30 * 1000)

	// it('download', async () => {
	// 	await download(version.version)
	// }, 50 * 1000)

	it('launch', async () => {
		// const path = await download(version.version)
		kill = await launch({
			// path,
			port,
			host,
			// debug: true,
			version,
		})
	}, 100 * 1000)

	// it('wait', async () => {
	// 	const client = new Client({ node: `http://${host}:${port}` })
	// 	await wait(client)
	// }, 50 * 1000)

	// it('fetch', async () => {
	// 	// curl -X GET https://localhost:9200 -u 'admin:admin' --insecure

	// 	const response = await fetch(`http://${host}:${port}/_cat/indices`, {
	// 		method: 'GET',
	// 		headers: {
	// 			'content-type': 'application/json',
	// 			// 'authorization': 'Basic ' + 'YWRtaW46YWRtaW4=',
	// 		}
	// 	})

	// 	console.log(response.status);

	// 	const body = await response.text()

	// 	console.log(body);
	// 	console.log(JSON.parse(body));

	// 	// console.log(await response.text());
	// 	// console.log(await response.json());

	// }, 50 * 1000)

	it('client', async () => {
		const client = new Client({
			node: `http://${host}:${port}`,
		})

		const result = await client.cat.indices({ format: 'json' })

		console.log(result);
	}, 50 * 1000)
})
