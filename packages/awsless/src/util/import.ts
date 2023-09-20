import { rollup, watch } from "rollup"
import { swc } from 'rollup-plugin-swc3'
import replace from 'rollup-plugin-replace'
import { EventIterator } from 'event-iterator'

import { dirname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { directories } from './path';
import { debug, debugError } from '../cli/logger';
import { style } from '../cli/style';
import { Module } from "../config";

export const importFile = async (path:string) => {

	const bundle = await rollup({
		input: path,
		onwarn: (error) => {
			debugError(error.message)
		},
		plugins: [
			replace({
				__dirname: (id) => `'${dirname(id)}'`,
			}),
			swc({
				minify: false,
				jsc: {
					baseUrl: dirname(path)
				}
			}),
		]
	})

	const outputFile = join(directories.cache, 'config.js')
	const result = await bundle.generate({
		format: 'esm',
		exports: 'default',
	})

	const output = result.output[0]
	const code = output.code

	await mkdir(directories.cache, { recursive: true })
	await writeFile(outputFile, code)

	debug('Save config file:', style.info(outputFile))

	return import(outputFile)
}

export const watchFile = (path:string) => {

	return new EventIterator<Module>((queue) => {
		const watcher = watch({
			watch: {
				skipWrite: true
			},
			input: path,
			onwarn: (error) => {
				debugError(error.message)
			},
			plugins: [
				replace({
					__dirname: (id) => `'${dirname(id)}'`,
				}),
				swc({
					minify: false,
					jsc: {
						baseUrl: dirname(path)
					}
				}),
			]
		})

		let resume: undefined | ((value: unknown) => void)
		queue.on('lowWater', () => {
			resume?.(true)
		})

		watcher.on('close', queue.stop)
		watcher.on('event', async (event) => {
			if(event.code === 'ERROR') {
				queue.fail(new Error(event.error.message))
			}

			if(event.code === 'BUNDLE_END') {
				const result = await event.result.generate({
					format: 'esm',
					exports: 'default',
				})

				event.result.close()

				const output = result.output[0]
				const code = output.code

				const outputFile = join(directories.cache, 'config.js')
				await mkdir(directories.cache, { recursive: true })
				await writeFile(outputFile, code)

				debug('Save config file:', style.info(outputFile))

				const config = await import(`${outputFile}?${Date.now()}`)

				queue.push(config)

				// await new Promise(resolve => {
				// 	resume = resolve
				// })
			}
		})

		return () => {
			watcher.close()
		}
	}, {
		highWaterMark: 1,
		lowWaterMark: 0
	})
}
