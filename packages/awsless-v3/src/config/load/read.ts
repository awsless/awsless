import { readFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { debug } from '../../cli/debug.js'
import { color } from '../../cli/ui/style.js'
import { FileError } from '../../error.js'
import { StagePatchSchema, applyStagePatch } from '../stage-patch.js'
import { fileExist } from '../../util/path.js'
import { validateConfig } from './validate.js'

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

type ConfigSource = {
	file: string
	data: object
}

export const readConfigWithStage = async (file: string, stage?: string) => {
	const config = await readConfig(file)

	if (!stage) {
		return {
			file,
			data: config,
		} satisfies ConfigSource
	}

	const ext = extname(file)
	const stageFileName = basename(file, ext) + '.' + stage + ext
	const stageFile = join(dirname(file), stageFileName)
	const stageFileExists = await fileExist(stageFile)

	if (!stageFileExists) {
		return {
			file,
			data: config,
		} satisfies ConfigSource
	}

	debug('Load env file:', color.info(stageFile))
	const stageConfig = await readConfig(stageFile)
	const patch = await validateConfig(StagePatchSchema, stageFile, stageConfig)

	return {
		file: stageFile,
		data: applyStagePatch(config, patch, stageFile) as object,
	} satisfies ConfigSource
}
