import { mkdir, rm, writeFile } from 'fs/promises'
import { dirname, join, relative } from 'path'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { features } from '../feature/index.js'
import { directories } from '../util/path.js'

export const generateTypes = async (props: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => {
	const files: string[] = []

	await Promise.all(
		features.map(async feature => {
			await feature.onTypeGen?.({
				...props,
				async write(file, data, include = false) {
					const code = data?.toString('utf8')
					const path = join(directories.types, file)

					if (code) {
						if (include) {
							files.push(relative(directories.root, path))
						}

						await mkdir(dirname(path), { recursive: true })
						await writeFile(path, code)
					}
				},
			})
		})
	)

	const referenceFile = join(directories.root, 'awsless.d.ts')

	// The features write in parallel, so the collected order is random -
	// sorted, the file only changes when the types do.
	if (files.length) {
		const code = files
			.toSorted()
			.map(file => `/// <reference path='${file}' />`)
			.join('\n')

		await writeFile(referenceFile, code)
	} else {
		// A stale reference file would point at types that no longer exist.
		await rm(referenceFile, { force: true })
	}
}
