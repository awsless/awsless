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

export const zipFiles = (files: Array<File | LocalFile>) => {
	const zip = new JSZip()

	for (const file of files) {
		if ('path' in file) {
			zip.file(file.name, createReadStream(file.path))
		} else {
			zip.file(file.name, file.code)
		}
	}

	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9,
		},
	})
}
