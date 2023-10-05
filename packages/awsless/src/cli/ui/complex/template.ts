import { mkdir, writeFile } from "fs/promises"
import { App } from '../../../formation/app.js'
import { directories } from '../../../util/path.js'
import { RenderFactory } from '../../lib/renderer.js'
import { loadingDialog } from '../layout/dialog.js'
import { join } from "path"

export const templateBuilder = (app:App):RenderFactory => {
	return async (term) => {
		const done = term.out.write(loadingDialog('Building stack templates...'))

		await Promise.all(app.stacks.map(async stack => {
			const template = stack.toString(true)
			const path = join(directories.template, app.name)
			const file = join(path, `${stack.name}.json`)

			await mkdir(path, { recursive: true })
			await writeFile(file, template)
		}))

		done('Done building stack templates')
	}
}
