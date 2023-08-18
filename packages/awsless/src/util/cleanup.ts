import { mkdir, rm } from "fs/promises"
import { directories } from "./path.js"
import { debug } from "../cli/logger.js"

export const cleanUp = async () => {

	debug('Clean up template, cache, and asset files')

	const paths = [
		directories.asset,
		directories.cache,
		directories.template,
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
