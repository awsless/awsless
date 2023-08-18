import { lstat } from "fs/promises"
import { join, normalize } from "path"

const root = process.cwd()

export const directories = {
	root,
	get output() { return join(this.root, '.awsless') },
	get cache() { return join(this.output, 'cache') },
	get asset() { return join(this.output, 'asset') },
	get template() { return join(this.output, 'template') },
}

export const setRoot = (path: string = root) => {
	directories.root = path
}

export const findRootDir = async (path: string, configFile: string, level = 5): Promise<string> => {
	if(!level) {
		throw new TypeError('No awsless project found')
	}

	const file = join(path, configFile)
	const exists = await fileExist(file)

	if(exists) {
		return path
	}

	return findRootDir(normalize(join(path, '..')), configFile, level - 1)
}

const fileExist = async (file:string) => {
	try {
		const stat = await lstat(file)
		if(stat.isFile()) {
			return true
		}
	} catch(error) {}

	return false
}
