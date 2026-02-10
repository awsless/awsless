import { color, log } from '@awsless/clui'
import { loadWorkspace } from '@awsless/ts-file-cache'
import { capitalCase } from 'change-case'
import wildstring from 'wildstring'
import { BuildTask } from '../../../app.js'
import { build, Metadata } from '../../../build/index.js'
import { ExpectedError } from '../../../error.js'
import { directories } from '../../../util/path.js'

export const buildAssets = async (builders: BuildTask[], stackFilters: string[], showResult = false) => {
	if (builders.length === 0) {
		return
	}

	const results: Array<
		BuildTask & {
			result: Metadata
		}
	> = []

	await log.task({
		initialMessage: 'Building assets...',
		successMessage: 'Done building assets.',
		errorMessage: 'Failed building assets.',
		async task() {
			const workspace = await loadWorkspace(directories.root)

			for (const builder of builders) {
				if (stackFilters && stackFilters.length > 0) {
					const found = stackFilters.find(f => wildstring.match(f, builder.stackName))

					if (!found) {
						continue
					}
				}

				try {
					const result = await build(builder.type, builder.name, builder.builder, {
						workspace,
					})
					results.push({ ...builder, result })
				} catch (error) {
					throw [
						//
						new ExpectedError(`Build failed for: ${builder.type} ${builder.name}`),
						error,
					]
				}
			}
		},
	})

	if (showResult) {
		log.table({
			head: ['Type', 'Resource', ...Object.keys(results.at(0)?.result ?? {})].map(v => capitalCase(v)),
			body: results.map(r => [color.magenta(r.type), r.name, ...Object.values(r.result ?? {})]),
		})
	}
}
