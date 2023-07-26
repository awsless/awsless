import { mkdir, rm } from "fs/promises"
import { assemblyDir, assetDir, cacheDir } from "./path.js"
import { debug } from "../cli/logger.js"

export const cleanUp = async () => {

	debug('Clean up assembly & asset files')

	const paths = [
		assemblyDir,
		assetDir,
		cacheDir,
	]

	// remove
	await Promise.all(paths.map(path => rm(path, {
		recursive: true,
		force: true,
		maxRetries: 2
	})))

	// make
	await Promise.all(paths.map(path => mkdir(path, {
		recursive: true
	})))
}
