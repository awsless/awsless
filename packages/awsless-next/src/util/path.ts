import { lstat } from 'fs/promises'
import { join, normalize, relative } from 'path'

const root = process.cwd()

export const directories = {
	root,
	get output() {
		return join(this.root, '.awsless')
	},
	get cache() {
		return join(this.output, 'cache')
	},
	get state() {
		return join(this.output, 'state')
	},
	get build() {
		return join(this.output, 'build')
	},
	get types() {
		return join(this.output, 'types')
	},
	get temp() {
		return join(this.output, 'temp')
	},
	// get template() {
	// 	return join(this.output, 'template')
	// },
	get test() {
		return join(this.output, 'test')
	},
}

export const setRoot = (path: string = root) => {
	directories.root = path
}

export const findRootDir = async (path: string, configFiles: string[], level = 5): Promise<[string, string]> => {
	if (!level) {
		throw new TypeError('No awsless project found')
	}

	for (const configFile of configFiles) {
		const file = join(path, configFile)
		const exists = await fileExist(file)

		if (exists) {
			return [file, path]
		}
	}

	return findRootDir(normalize(join(path, '..')), configFiles, level - 1)
}

export const fileExist = async (file: string) => {
	try {
		const stat = await lstat(file)
		if (stat.isFile()) {
			return true
		}
	} catch (error) {}

	return false
}

export const relativePath = (path: string) => {
	return relative(root, path)
}
