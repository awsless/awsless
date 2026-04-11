import { mkdir, readFile, writeFile } from 'fs/promises'
import { App } from '../../../formation/app.js'
import { directories } from '../../../util/path.js'
import { createTimer } from '../../../util/timer.js'
import { RenderFactory } from '../../lib/renderer.js'
import { Signal, derive } from '../../lib/signal.js'
import { style, symbol } from '../../style.js'
import { br } from '../layout/basic.js'
import { loadingDialog } from '../layout/dialog.js'
import { flexLine } from '../layout/flex-line.js'
import { createSpinner } from '../layout/spinner.js'
import { dirname, join } from 'path'
import { Asset } from '../../../formation/asset.js'
import { Stack } from '../../../formation/stack.js'
import { promise } from 'fastq'
import { debug } from '../../logger.js'

export const assetBuilder = (app: App): RenderFactory => {
	debug('Start building assets')

	return async term => {
		const assets: Asset[] = []
		const stacks: Stack[] = []

		for (const stack of app) {
			for (const asset of stack.assets) {
				if (asset.build) {
					assets.push(asset)
					stacks.push(stack)
				}
			}
		}

		if (assets.length === 0) {
			return
		}

		const showDetailedView = true
		// const showDetailedView = assets.length <= term.out.height() - 2
		const done = term.out.write(loadingDialog('Building stack assets...'))
		const group = new Signal<Array<string | Signal>>([])
		// const group = new Signal<any[]>([''])
		if (showDetailedView) {
			term.out.gap()
			term.out.write(group)
		}

		const stackNameSize = Math.max(...stacks.map(stack => stack.name.length))
		const assetTypeSize = Math.max(...assets.map(asset => asset.type.length))

		const queue = promise(async ({ stack, asset }: { stack: Stack; asset: Asset }) => {
			if (!asset.build) {
				return
			}

			const [icon, stop] = createSpinner()
			const details = new Signal<Record<string, string>>({})

			const line = flexLine(
				term,
				[
					icon,
					' ',
					style.label(stack.name),
					' '.repeat(stackNameSize - stack.name.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.warning(asset.type),
					' '.repeat(assetTypeSize - asset.type.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					style.info(asset.id),
					' ',
				],
				[
					' ',
					derive([details], details => {
						return Object.entries(details)
							.map(([key, value]) => {
								return `${style.label(key)} ${value}`
							})
							.join(style.placeholder(' ─ '))
					}),
					br(),
				]
			)

			group.update(group => [...group, line])

			const timer = createTimer()

			const getFullPath = (file: string) => {
				return join(directories.asset, asset.type, app.name, stack.name, asset.id, file)
			}

			const getFingerPrint = async () => {
				try {
					const value = await readFile(getFullPath('FINGER_PRINT'), 'utf8')
					return value
				} catch (_) {
					return undefined
				}
			}

			try {
				const data = await asset.build!({
					async write(fingerprint, cb) {
						const prev = await getFingerPrint()
						if (prev === fingerprint && !process.env.NO_CACHE) {
							debug(
								'Skip building:',
								style.label(stack.name),
								style.warning(asset.type),
								style.info(asset.id)
							)
							return
						}

						debug('Build:', style.label(stack.name), style.warning(asset.type), style.info(asset.id))

						try {
							await cb(async (file, data) => {
								const fullpath = getFullPath(file)
								const basepath = dirname(fullpath)

								await mkdir(basepath, { recursive: true })
								await writeFile(fullpath, data)
							})
						} catch (error) {
							// Error building asset

							// icon.set(style.error(symbol.error))
							// throw new BuildError(file, error)
							throw error
						}

						const file = getFullPath('FINGER_PRINT')
						const basepath = dirname(file)

						await mkdir(basepath, { recursive: true })
						await writeFile(file, fingerprint)
					},
					async read(fingerprint, files) {
						const prev = await getFingerPrint()
						if (prev !== fingerprint) {
							debug('Outdated fingerprint:', stack.name, asset.type, asset.id)
							throw new TypeError(`Outdated fingerprint: ${fingerprint}`)
						}

						return Promise.all(
							files.map(file => {
								return readFile(getFullPath(file))
							})
						)
					},
				})

				details.set({
					...data,
					time: timer(),
				})

				icon.set(style.success(symbol.success))
			} catch (error) {
				icon.set(style.error(symbol.error))
				throw error
			} finally {
				stop()
			}
		}, 3)

		let failure: unknown

		await Promise.all(
			app.stacks.map(async stack => {
				await Promise.all(
					[...stack.assets].map(async asset => {
						try {
							await queue.push({ stack, asset })
						} catch (error) {
							failure = error
						}
					})
				)
			})
		)

		if (failure) {
			throw failure
		}

		// await Promise.all(
		// 	app.stacks.map(async stack => {
		// 		const group = new Signal<Array<string | Signal>>([])

		// 		groups.update(groups => [...groups, group])

		// 		await Promise.all(
		// 			[...stack.assets].map(async asset => {
		// 				if (!asset.build) {
		// 					return
		// 				}

		// 				const [icon, stop] = createSpinner()
		// 				const details = new Signal<Record<string, string>>({})

		// 				const line = flexLine(
		// 					term,
		// 					[
		// 						icon,
		// 						' ',
		// 						style.label(stack.name),
		// 						' '.repeat(stackNameSize - stack.name.length),
		// 						' ',
		// 						style.placeholder(symbol.pointerSmall),
		// 						' ',
		// 						style.warning(asset.type),
		// 						' '.repeat(assetTypeSize - asset.type.length),
		// 						' ',
		// 						style.placeholder(symbol.pointerSmall),
		// 						' ',
		// 						style.info(asset.id),
		// 						' ',
		// 					],
		// 					[
		// 						' ',
		// 						derive([details], details => {
		// 							return Object.entries(details)
		// 								.map(([key, value]) => {
		// 									return `${style.label(key)} ${value}`
		// 								})
		// 								.join(style.placeholder(' ─ '))
		// 						}),
		// 						br(),
		// 					]
		// 				)

		// 				group.update(group => [...group, line])

		// 				const timer = createTimer()

		// 				const getFullPath = (file: string) => {
		// 					return join(directories.asset, asset.type, app.name, stack.name, asset.id, file)
		// 				}

		// 				const getFingerPrint = async () => {
		// 					try {
		// 						const value = await readFile(getFullPath('FINGER_PRINT'), 'utf8')
		// 						return value
		// 					} catch (_) {
		// 						return undefined
		// 					}
		// 				}

		// 				try {
		// 					const data = await asset.build({
		// 						async write(fingerprint, cb) {
		// 							const prev = await getFingerPrint()
		// 							if (prev === fingerprint && !process.env.NO_CACHE) {
		// 								return
		// 							}

		// 							try {
		// 								await cb(async (file, data) => {
		// 									const fullpath = getFullPath(file)
		// 									const basepath = dirname(fullpath)

		// 									await mkdir(basepath, { recursive: true })
		// 									await writeFile(fullpath, data)
		// 								})
		// 							} catch (error) {
		// 								// Error building asset
		// 								// icon.set(style.error(symbol.error))
		// 								throw error
		// 							}

		// 							const file = getFullPath('FINGER_PRINT')
		// 							const basepath = dirname(file)

		// 							await mkdir(basepath, { recursive: true })
		// 							await writeFile(file, fingerprint)
		// 						},
		// 						async read(fingerprint, files) {
		// 							const prev = await getFingerPrint()
		// 							if (prev !== fingerprint) {
		// 								throw new TypeError(`Outdated fingerprint: ${fingerprint}`)
		// 							}

		// 							return Promise.all(
		// 								files.map(file => {
		// 									return readFile(getFullPath(file))
		// 								})
		// 							)
		// 						},
		// 					})

		// 					details.set({
		// 						...data,
		// 						time: timer(),
		// 					})

		// 					icon.set(style.success(symbol.success))
		// 				} catch (error) {
		// 					icon.set(style.error(symbol.error))
		// 					throw error
		// 				} finally {
		// 					stop()
		// 				}
		// 			})
		// 		)
		// 	})
		// )

		done('Done building stack assets')

		if (showDetailedView) {
			term.out.gap()
		}
	}
}
