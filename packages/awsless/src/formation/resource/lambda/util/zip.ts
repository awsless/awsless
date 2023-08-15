import JSZip from "jszip"
import { File } from "../code"

export const zipFiles = (files: File[]) => {
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
