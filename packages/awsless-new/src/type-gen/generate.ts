import { mkdir, writeFile } from 'fs/promises'
import { directories } from '../util/path.js'
import { dirname, join, relative } from 'path'
import { features } from '../feature/index.js'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'

export const generateTypes = async (appConfig: AppConfig, stackConfigs: StackConfig[]) => {
	const files: string[] = []

	await Promise.all(
		features.map(feature => {
			return feature.onTypeGen?.({
				appConfig,
				stackConfigs,
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

	if (files.length) {
		const code = files.map(file => `/// <reference path='${file}' />`).join('\n')
		await writeFile(join(directories.root, `awsless.d.ts`), code)
	}
}
