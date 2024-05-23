import { App, AppError, aws, Stack } from '../../src'
import { createWorkspace } from './_util'

const region = 'eu-west-1'
const workspace = createWorkspace('jacksclub', region, 60)
const app = new App('open-search')
const stack = new Stack(app, 'open-search')

// const { vpc, subnets } = createVPC(stack, region)

new aws.openSearch.Domain(stack, 'open-search', {
	name: 'test-open-search',
	version: '2.11',
	instance: {
		type: 't3.small',
		count: 1,
	},
	accessPolicy: {
		version: '2012-10-17',
		statements: [
			{
				principal: 'lambda.amazonaws.com',
				sourceArn: 'arn:*',
			},
		],
	},
})

console.log('START')

try {
	await workspace.deployApp(app)
	// await workspace.deleteApp(app)
} catch (error) {
	if (error instanceof AppError) {
		for (const issue of error.issues) {
			console.error(issue)
		}
	}

	throw error
}

console.log('END')
