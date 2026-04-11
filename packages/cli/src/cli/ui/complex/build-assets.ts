import { log } from '@awsless/clui'
import { loadWorkspace } from '@awsless/ts-file-cache'
import { capitalCase } from 'change-case'
import wildstring from 'wildstring'
import { BuildTask } from '../../../app.js'
import { build, Metadata } from '../../../build/index.js'
import { ExpectedError } from '../../../error.js'
import { directories } from '../../../util/path.js'
import { color } from '../style.js'

export const buildAssets = async (builders: BuildTask[], stackFilters: string[], showResult = false) => {
	const filteredBuilders = builders.filter(builder => {
		if (stackFilters && stackFilters.length > 0) {
			const found = stackFilters.find(f => wildstring.match(f, builder.stackName))

			if (!found) {
				return false
			}
		}
		return true
	})

	if (filteredBuilders.length === 0) {
		return
	}

	const results: Array<
		BuildTask & {
			result: Metadata
		}
	> = []

	await log.task({
		initialMessage: `Building assets...`,
		successMessage: 'Done building assets.',
		errorMessage: 'Failed building assets.',
		async task(ctx) {
			const workspace = await loadWorkspace(directories.root)
			let i = 0
			for (const builder of filteredBuilders) {
				ctx.updateMessage(
					`Building (${++i}/${filteredBuilders.length}) ${color.info(builder.name)} ${builder.type}...`
				)

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
			body: results.map(r => [color.info(r.type), r.name, ...Object.values(r.result ?? {})]),
		})
	}
}
