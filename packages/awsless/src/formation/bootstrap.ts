import { StackClient } from '../formation/client.js'
import { debug } from '../cli/logger.js'
import { App } from '../formation/app.js'
import { Bucket } from '../formation/resource/s3/bucket.js'
import { Stack } from '../formation/stack.js'
import { Region } from '../schema/region.js'

export const assetBucketName = (account:string, region:Region) => {
	return `awsless-bootstrap-${ account }-${ region }`
}

export const assetBucketUrl = (account:string, region:Region, stack:Stack) => {
	const bucket = assetBucketName(account, region)
	return `https://s3-${ region }.amazonaws.com/${ bucket }/${ stack.name }/cloudformation.json`
}

const version = '1'

export const bootstrapStack = (account:string, region:Region) => {
	const app = new App('awsless')
	const stack = new Stack('bootstrap', region)

	stack.add(new Bucket('assets', {
		name: assetBucketName(account, region),
		accessControl: 'private',
		versioned: true,
	}))

	stack.export('version', version)
	app.add(stack)

	return { app, stack }
}

export const shouldDeployBootstrap = async (client: StackClient, stack: Stack) => {
	debug('Check bootstrap status')
	const info = await client.get(stack.name, stack.region)

	return (
		!info ||
		info.outputs.version !== version ||
		![ 'CREATE_COMPLETE', 'UPDATE_COMPLETE' ].includes(info.status)
	)
}


// import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'

// const iot = new IoTDataPlaneClient({})

// export default async (event) => {
// 	console.log(event)

// 	if (
// 		event.source !== "aws.cloudformation" ||
// 		event["detail-type"] !== "CloudFormation Stack Status Change"
// 	) {
// 		return;
// 	}

// 	// Get metadata
// 	const stack = event.detail["stack-id"];
// 	console.log("Stack id:", stack);
// 	const res = await getMetadata(stack);
// 	if (!res) {
// 		console.log("Stack metadata resource not found");
// 		return;
// 	}

// 	// Update metadata
// 	const { app, stage, metadata } = res;
// 	const stackName = stack.split("/")[1];

// 		await saveMetadata(stackName, app, stage, metadata);
// 		await sendIotEvent(app, stage, `stacks.metadata.updated`);
// 	}
// }
