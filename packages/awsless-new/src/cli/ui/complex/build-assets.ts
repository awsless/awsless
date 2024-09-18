import { loadWorkspace } from '@awsless/ts-file-cache'
import chalk from 'chalk'
import { BuildTask } from '../../../app.js'
import { build, Metadata } from '../../../build/index.js'
import { directories } from '../../../util/path.js'
import { table, task } from '../util.js'

export const buildAssets = async (builders: BuildTask[], showResult = false) => {
	if (builders.length === 0) {
		return
	}

	const results: Array<
		BuildTask & {
			result: Metadata
		}
	> = []

	await task('Building assets', async update => {
		const workspace = await loadWorkspace(directories.root)

		for (const builder of builders) {
			const result = await build(builder.type, builder.name, builder.builder, {
				workspace,
			})

			results.push({ ...builder, result })
		}

		update('Done building assets.')
	})

	if (showResult) {
		console.log(
			table({
				head: ['type', 'resource', ...Object.keys(results.at(0)?.result ?? {})],
				body: results.map(r => [chalk.magenta(r.type), r.name, ...Object.values(r.result ?? {})]),
			})
		)
	}
}
