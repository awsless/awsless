import { InlineProgramArgs, LocalWorkspace } from '@pulumi/pulumi/automation'
import * as aws from '@pulumi/aws'
// import * as awsx from '@pulumi/awsx'
// import * as pulumi from '@pulumi/pulumi'

// This is our pulumi program in "inline function" form
const pulumiProgram = async () => {
	const table = new aws.dynamodb.Table('table', {
		name: 'test-table',
		hashKey: 'key',
		attributes: [
			{
				name: 'key',
				type: '',
			},
		],
	})

	// table.replicas

	return {
		arn: table.arn,
	}
}

// Create our stack
const args: InlineProgramArgs = {
	stackName: 'test-stack',
	projectName: 'test-app',
	program: pulumiProgram,
}

const getStack = async () => {
	// console.info('--- 1')

	// const workspace = await LocalWorkspace.create({
	// 	projectSettings: {
	// 		name: 'test-app',
	// 		runtime: 'nodejs',
	// 		backend: {
	// 			url: 's3://pulumi-test-aws',
	// 		},
	// 	},
	// })

	console.info('--- 2')

	// Create (or select if one already exists) a stack that uses our inline program
	const stack = await LocalWorkspace.createStack(args, {
		projectSettings: {
			name: args.projectName,
			runtime: 'nodejs',
			backend: {
				url: 's3://pulumi-test-aws',
			},
		},
	})

	await stack.setConfig('aws:profile', { value: 'jacksclub' })
	await stack.setConfig('aws:region', { value: aws.Region.EUWest1 })
	await stack.refresh({
		onOutput: console.info,
	})

	return stack
}

const main = async () => {
	const stack = await getStack()

	// if (destroy) {
	// 	console.info('destroying stack...')
	// 	await stack.destroy({ onOutput: console.info })
	// 	console.info('stack destroy complete')
	// 	process.exit(0)
	// }

	console.info('updating stack...')

	const upRes = await stack.up({
		onOutput: console.info,
	})

	console.log(`update summary: \n${JSON.stringify(upRes.summary.resourceChanges, null, 4)}`)
	console.log(`db host url: ${upRes.outputs.host.value}`)
	console.info('configuring db...')
}

main()
