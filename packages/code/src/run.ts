
import { spawn as spawnChild } from 'child_process'
import { RuntimeError } from './error/runtime'
import { rollup, RollupOptions } from './rollup/index'

interface Options extends RollupOptions {
	includePackages?: boolean
	env?: string[]
}

export const spawn = async (input:string, options:Options = {}) => {
	const { code } = await rollup(input, {
		external(importee) {
			if (options.includePackages) return false
			return !['.', '/'].includes(importee[0])
		},
		...options,
		sourceMap: false
	})

	let node

	if (options.env && options.env.length > 0) {
		node = spawnChild('env', [...options.env, 'node'])
	} else {
		node = spawnChild('node')
	}

	node.stdin.write(code)
	node.stdin.end()

	return node
}

export const exec = async (input:string, options:Options = {}) => {
	const node = await spawn(input, options)
	return new Promise((resolve, reject) => {
		const outs:Buffer[] = []
		const errs:Buffer[] = []

		node.stderr.on('data', (data) => {
			errs.push(data)
		})

		node.stdout.on('data', (data) => {
			outs.push(data)
		})

		node.on('error', reject)
		node.on('exit', () => {
			if (errs.length) {
				const error = Buffer
					.concat(errs)
					.toString('utf8')
					.replace(/\n$/, '')

				return reject(new RuntimeError(error))
			}

			const result = Buffer
				.concat(outs)
				.toString('utf8')
				.replace(/\n$/, '')

			resolve(result)
		})
	})
}
