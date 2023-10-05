
import { Config } from '../../../config.js'
import { generateResourceTypes } from '../../../util/type-gen.js'
import { Terminal } from '../../lib/terminal.js'
import { loadingDialog } from '../layout/dialog.js'

export const typesGenerator = (config:Config) => {
	return async (term:Terminal) => {
		const done = term.out.write(loadingDialog('Generate type definition files...'))
		await generateResourceTypes(config)

		done('Done generating type definition files')
	}
}
