// import { createReadStream } from "fs"
import { join } from "path"
// import { pipeline } from "stream/promises"
// import { Extract } from "unzip"
import decompress from 'decompress'

const unzipBundle = async (sourceFile: string, destinationDirectory: string) => {
	// await pipeline(
	// 	createReadStream(sourceFile),
  	// 	Extract({ path: destinationDirectory })
	// )

	await decompress(sourceFile, destinationDirectory)
}

describe('unzip', () => {
	it('unzip', async () => {
		await unzipBundle(
			join(process.cwd(), 'test/_data/files/bundle.zip'),
			join(process.cwd(), 'test/_data/files/contents')
		)
	})
})
