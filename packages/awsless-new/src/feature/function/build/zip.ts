import JSZip from 'jszip'

export type File = {
	name: string
	code: Buffer
	map?: Buffer
}

export const zipFiles = (files: File[]) => {
	const zip = new JSZip()

	for (const file of files) {
		zip.file(file.name, file.code)
	}

	return zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9,
		},
	})
}
