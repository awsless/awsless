
import { Command } from 'commander'
import { build } from './build'
import { clean } from './clean'
import { spawn } from './index'
import { test } from './test'

const program = new Command()

program.name('code')

program
	.command('run')
	.argument('<file>', 'file to execute')
	.description('execute a file')
	.option('-e, --env <variables...>', 'space separated environment variables')
	.option('--include-packages', 'include all packages inside the build process')
	.action(async (input, options) => {
		const node = await spawn(input, options)
		node.stdout.pipe(process.stdout)
		node.stderr.pipe(process.stderr)
	})

program
	.command('build')
	.argument('<files...>', 'files to build')
	.description('build project')
	.option('-o, --output', 'output directory', 'dist')
	.option('-c, --clean', 'clean up output directory')
	.action(async (input, options) => {
		if(options.clean) {
			await clean(options.output)
		}

		await build(input, options.output)
	})

program
	.command('test')
	.argument('[filters...]', 'filters of the test files to run')
	.description('test project')
	.action(async (filters) => {
		await test(filters)
	})

program.parse(process.argv)
