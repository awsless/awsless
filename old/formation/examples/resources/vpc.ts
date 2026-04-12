import { App, AppError, Stack } from '../../src'
import { createVPC, createWorkspace } from './_util'

const region = 'eu-west-1'
const workspace = createWorkspace('jacksclub')
const app = new App('vpc')
const stack = new Stack(app, 'vpc')

createVPC(stack, region)

console.log('START')

try {
	// await workspace.deployApp(app)
	await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
