import { Command } from 'commander'
import { layout } from '../ui/complex/layout.js'
import { buildTypes } from '../ui/complex/build-types.js'
import { color } from '../ui/style.js'

export const types = (program: Command) => {
	program
		.command('types')
		.description('Generate type definition files')
		.action(async () => {
			await layout('types', async props => {
				await buildTypes(props)

				return `Ready to use the ${color.info('@awsless/awsless')} libary!`
			})
		})
}
