import { LocalWorkspace } from '@pulumi/pulumi/automation'
import * as aws from '@pulumi/aws'

const pulumiProgram = async () => {
	const table = new aws.dynamodb.Table('table', {
		name: 'test-table',
		hashKey: 'key',
	})

	return {
		arn: table.arn,
	}
}

const deploy = async () => {
	const stack = await LocalWorkspace.createOrSelectStack(
		{
			stackName: 'test-stack',
			projectName: 'test-app',
			program: pulumiProgram,
		},
		{
			projectSettings: {
				name: 'test-app',
				runtime: 'nodejs',
				backend: {
					url: 's3://pulumi-test-aws',
				},
			},
		}
	)

	// await stack.workspace.installPlugin('aws', 'v4.0.0')
	await stack.setConfig('aws:region', { value: aws.Region.EUWest1 })
	await stack.refresh({ onOutput: console.info })

	const response = await stack.up({
		onOutput: console.info,
	})

	console.log(response)
}

deploy()
