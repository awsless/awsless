import JSZip from 'jszip'
import { createReadStream } from 'node:fs'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

type BundleProps = {
	directory: string
}

export const customBundle = async ({ directory }: BundleProps) => {
	const zip = new JSZip()
	const list = await readdir(directory)

	for (const file of list) {
		console.log(file)

		const path = join(directory, file)
		const stat = await lstat(path)

		if (stat.isFile()) {
			zip.file(file, createReadStream(path))
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
