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

export const assetBuilder = (app: App): RenderFactory => {
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

		const showDetailedView = assets.length <= term.out.height() - 2
		const done = term.out.write(loadingDialog('Building stack assets...'))
		const groups = new Signal<any[]>([''])

		if (showDetailedView) {
			term.out.gap()
			term.out.write(groups)
		}

		const stackNameSize = Math.max(...stacks.map(stack => stack.name.length))
		const assetTypeSize = Math.max(...assets.map(asset => asset.type.length))

		await Promise.all(
			app.stacks.map(async stack => {
				const group = new Signal<Array<string | Signal>>([])

				groups.update(groups => [...groups, group])

				await Promise.all(
					[...stack.assets].map(async asset => {
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
							let value: string
							try {
								value = await readFile(getFullPath('FINGER_PRINT'), 'utf8')
							} catch (_) {
								return undefined
							}
							return value
						}

						try {
							const data = await asset.build({
								async write(fingerprint, cb) {
									const prev = await getFingerPrint()
									if (prev === fingerprint && !process.env.NO_CACHE) {
										return
									}

									const file = getFullPath('FINGER_PRINT')
									const basepath = dirname(file)

									await mkdir(basepath, { recursive: true })
									await writeFile(file, fingerprint)

									await cb(async (file, data) => {
										const fullpath = getFullPath(file)
										const basepath = dirname(fullpath)

										await mkdir(basepath, { recursive: true })
										await writeFile(fullpath, data)
									})
								},
								async read(fingerprint, files) {
									const prev = await getFingerPrint()
									if (prev !== fingerprint) {
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
					})
				)
			})
		)

		done('Done building stack assets')

		if (showDetailedView) {
			term.out.gap()
		}
	}
}
