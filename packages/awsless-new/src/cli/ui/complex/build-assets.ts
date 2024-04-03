import { BuildTask } from '../../../app.js'
import { Metadata, build } from '../../../build/index.js'
import chalk from 'chalk'
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
		for (const builder of builders) {
			const result = await build(builder.type, builder.name, builder.builder)
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
