
import { program } from '../src/cli/program.js'

describe('commands', () => {

	program.exitOverride()

	const run = (...args: string[]) => {
		return program.parseAsync([
			'bin', 'awsless', ...args, '--config-file=test/_data/config.ts',
		])
	}

	it('bootstrap', async () => {

		// await run('bootstrap')
		// await run('bootstrap', '--verbose')

	}, 20 * 1000)

	it('deploy', async () => {

		await run('deploy')

	}, 20 * 1000)

	it('status', async () => {

		await run('status')

	}, 20 * 1000)

})
