import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const workspace = createWorkspace('jacksclub')
const app = new App('dynamodb')
const stack = new Stack(app, 'dynamodb')

new aws.dynamodb.Table(stack, 'table', {
	name: 'dynamodb-test',
	hash: 'code',
	sort: 'tenantId',
	class: 'standard',
	indexes: {
		list: {
			hash: 'playerId',
			sort: 'id',
		},
	},
})

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
