import { App, CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib"
import { Config } from "../config"
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3"
import { StackClient } from "./client"
import { debug } from "../cli/logger"
// import { Architecture, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda"
// import { toDuration } from "../util/duration"
// import { toSize } from "../util/size"
// import { toRuntime } from "../resource/function/runtime"
// import { toArchitecture } from "../resource/function/architecture"
// import { PolicyStatement } from "aws-cdk-lib/aws-iam"
// import { LambdaFunction } from "aws-cdk-lib/aws-events-targets"
// import { Rule } from "aws-cdk-lib/aws-events"

export const assetBucketName = (config:Config) => {
	return `awsless-bootstrap-${ config.account }-${ config.region }`
}

export const assetBucketUrl = (config:Config, stackName:string) => {
	const bucket = assetBucketName(config)
	return `https://s3-${ config.region }.amazonaws.com/${ bucket }/${ stackName }/cloudformation.json`
}

const version = '2'

export const bootstrapStack = (config:Config, app:App) => {
	const stack = new Stack(app, 'bootstrap', {
		stackName: `awsless-bootstrap`
	})

	new Bucket(stack, 'assets', {
		bucketName: assetBucketName(config),
		versioned: true,
		accessControl: BucketAccessControl.PRIVATE,
		removalPolicy: RemovalPolicy.DESTROY,
	})

	new CfnOutput(stack, 'version', {
		exportName: 'version',
		value: version,
	})

	return stack
}

export const shouldDeployBootstrap = async (client: StackClient, name: string) => {
	debug('Check bootstrap status')
	const info = await client.get(name)

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
