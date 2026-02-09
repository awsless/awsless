import { readFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { debug } from '../../cli/debug.js'
import { color } from '../../cli/ui/style.js'
import { FileError } from '../../error.js'
import { fileExist } from '../../util/path.js'

export const readConfig = async (file: string) => {
	try {
		const json = await readFile(file, 'utf8')
		const data = Bun.JSON5.parse(json) as object

		return data
	} catch (error) {
		if (error instanceof Error) {
			throw new FileError(file, error.message)
		}

		throw error
	}
}

export const readConfigWithStage = async (file: string, stage?: string) => {
	const config = await readConfig(file)

	if (!stage) {
		return config
	}

	const ext = extname(file)
	const stageFileName = basename(file, ext) + '.' + stage + ext
	const stageFile = join(dirname(file), stageFileName)
	const stageFileExists = await fileExist(stageFile)

	if (!stageFileExists) {
		return config
	}

	debug('Load env file:', color.info(stageFile))
	const stageConfig = await readConfig(stageFile)

	return stageConfig
}
