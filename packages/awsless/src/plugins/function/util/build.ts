
import JSZip from 'jszip'
import { functionDir } from '../../../util/path.js'
import { Stack } from 'aws-cdk-lib'
import { basename, join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { Config } from '../../../config.js'
import { debug } from '../../../cli/logger.js'
import { filesize } from 'filesize'
import { style } from '../../../cli/style.js'

export type File = {
	name: string
	code: Buffer | string
	map?: Buffer | string
}

export type Build = (file:string) => Promise<{
	handler: string
	hash: string
	files: File[]
}>

const zipFiles = (files: File[]) => {
	const zip = new JSZip()

	for(const file of files) {
		zip.file(file.name, file.code)
	}

	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9
		}
	})
}

export const writeBuildHash = async (config:Config, stack: Stack, id: string, hash: string) => {
	const funcPath = join(functionDir, config.name, stack.artifactId, id)
	const versionFile = join(funcPath, 'HASH')

	await writeFile(versionFile, hash)
}

export const writeBuildFiles = async (config:Config, stack: Stack, id: string, files: File[]) => {
	const bundle = await zipFiles(files)
	const funcPath = join(functionDir, config.name, stack.artifactId, id)
	const filesPath = join(funcPath, 'files')
	const bundleFile = join(funcPath, 'bundle.zip')

	debug('Bundle size of', style.info(join(config.name, stack.artifactId, id)), 'is', style.attr(filesize(bundle.byteLength)))

	await mkdir(filesPath, { recursive: true })
	await writeFile(bundleFile, bundle)

	await Promise.all(files.map(async file => {
		const fileName = join(filesPath, file.name)
		await mkdir(basename(fileName), { recursive: true })
		await writeFile(fileName, file.code)

		if(file.map) {
			const mapName = join(filesPath, `${file.name}.map`)
			await writeFile(mapName, file.map)
		}
	}))

	return {
		file: bundleFile,
		size: bundle.byteLength
	}
}
