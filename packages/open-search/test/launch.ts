import { stat } from 'fs/promises'
import { join } from 'path'
import { download } from '../src/server/download'
import { VERSION_3_5_0_MIN } from '../src/server/version'

// Booting a node is covered by the mock suite through mockOpenSearch;
// booting a second one in parallel only slows the whole run down.
describe('Download', () => {
	const version = VERSION_3_5_0_MIN

	it(
		'download',
		async () => {
			const path = await download(version)

			await stat(join(path, 'bin/opensearch'))
		},
		1000 * 1000
	)

	it(
		'download is cached',
		async () => {
			const start = Date.now()
			await download(version)

			expect(Date.now() - start).toBeLessThan(1000)
		},
		10 * 1000
	)
})
