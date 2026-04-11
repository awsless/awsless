import JSZip from 'jszip'
import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

type BundleProps = {
	directory: string
}

export const zipBundle = async ({ directory }: BundleProps) => {
	const zip = new JSZip()
	const list = await readdir(directory, {
		recursive: true,
		withFileTypes: true,
	})

	for (const file of list) {
		if (file.isFile()) {
			const path = join(file.path, file.name)
			const rel = relative(directory, path)

			zip.file(rel, createReadStream(path))
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
