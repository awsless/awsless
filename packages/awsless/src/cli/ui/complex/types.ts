
import { Config } from '../../../config'
import { generateResourceTypes } from '../../../util/type-gen'
import { Terminal } from '../../lib/terminal'
import { loadingDialog } from '../layout/dialog'

export const typesGenerator = (config:Config) => {
	return async (term:Terminal) => {
		const done = term.out.write(loadingDialog('Generate type definition files...'))
		await generateResourceTypes(config)

		done('Done generating type definition files')
	}
}
