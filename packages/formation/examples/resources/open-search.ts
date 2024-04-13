import { aws, App, Stack } from '../../src'
import { createVPC, createWorkspace } from './_util'

const region = 'eu-west-1'
const app = new App('open-search')
const stack = new Stack('open-search')
app.add(stack)

// const { vpc, subnets } = createVPC(stack, region)

const openSearchDomain = new aws.openSearch.Domain('open-search', {
	name: 'test-open-search',
	instance: {
		type: 't3.small.search',
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

// stack.add(openSearchDomain)

const main = async () => {
	const workspace = createWorkspace('jacksclub', region, 60)
	await workspace.deployStack(stack)
}

main()
