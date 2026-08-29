import { createReadStream } from 'fs'
import JSZip from 'jszip'

export type File = {
	name: string
	code: Buffer
	map?: Buffer
}

export type LocalFile = {
	name: string
	path: string
}

const options = {
	type: 'nodebuffer',
	compression: 'DEFLATE',
	compressionOptions: {
		level: 9,
	},
} as const

export const zipFiles = (files: Array<File | LocalFile>) => {
	const zip = new JSZip()

	for (const file of files) {
		if ('path' in file) {
			zip.file(file.name, createReadStream(file.path))
		} else {
			zip.file(file.name, file.code)
		}
	}

	return zip.generateAsync(options)
}

// Inject the deploy-time env file into a prebuilt archive. The existing
// entries keep their compressed data as-is, so this stays cheap enough
// to run inside an input resolve - compressing the build itself there
// would race the resolve watchdog & fail the deploy.
export const zipWithEnvFile = async (archive: Buffer, envFile: Buffer) => {
	const zip = await JSZip.loadAsync(archive)

	zip.file('awsless-env.mjs', envFile)

	return zip.generateAsync(options)
}
