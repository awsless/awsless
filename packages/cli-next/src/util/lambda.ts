import {
	CreateAliasCommand,
	DeleteAliasCommand,
	GetAliasCommand,
	LambdaClient,
	UpdateAliasCommand,
	UpdateFunctionCodeCommand,
} from '@aws-sdk/client-lambda'
import { Credentials, isError } from './aws'

// ------------------------------------------------------------
// Alias naming contract

export const LIVE_ALIAS = 'live'

export const getDeploymentAliasName = (id: number) => `deployment-${id}`

export const parseDeploymentAliasName = (name: string) => {
	const match = name.match(/^deployment-(\d+)$/)

	return match ? Number(match[1]) : undefined
}

// ------------------------------------------------------------
// Alias plumbing

export const getAlias = async (lambda: LambdaClient, functionName: string, name: string) => {
	try {
		return await lambda.send(
			new GetAliasCommand({
				FunctionName: functionName,
				Name: name,
			})
		)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}

		return
	}
}

// Update-first upsert for aliases that almost always exist (the live alias).
export const upsertAlias = async (
	lambda: LambdaClient,
	props: {
		functionName: string
		functionVersion: string
		name: string
		description: string
	}
) => {
	const input = {
		FunctionName: props.functionName,
		Name: props.name,
		FunctionVersion: props.functionVersion,
		Description: props.description,
	}

	try {
		await lambda.send(new UpdateAliasCommand(input))
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}

		try {
			await lambda.send(new CreateAliasCommand(input))
		} catch (error) {
			if (!isError(error, 'ResourceConflictException')) {
				throw error
			}

			await lambda.send(new UpdateAliasCommand(input))
		}
	}
}

// Create-first upsert for aliases that are usually new (deployment markers).
export const createAlias = async (
	lambda: LambdaClient,
	props: {
		functionName: string
		functionVersion: string
		name: string
	}
) => {
	const input = {
		FunctionName: props.functionName,
		FunctionVersion: props.functionVersion,
		Name: props.name,
	}

	try {
		await lambda.send(new CreateAliasCommand(input))
	} catch (error) {
		if (!isError(error, 'ResourceConflictException')) {
			throw error
		}

		await lambda.send(new UpdateAliasCommand(input))
	}
}

export const deleteAlias = async (lambda: LambdaClient, functionName: string, name: string) => {
	try {
		await lambda.send(
			new DeleteAliasCommand({
				FunctionName: functionName,
				Name: name,
			})
		)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}
}

export const restartLambdaFunctions = async ({
	credentials,
	region,
	functions,
}: {
	credentials: Credentials
	region: string
	functions: {
		functionName: string
		s3: {
			bucket: string
			key: string
			version?: string
		}
	}[]
}) => {
	const client = new LambdaClient({
		credentials,
		region,
	})

	await Promise.all(
		functions.map(async item => {
			// const result = await client.send(
			// 	new GetFunctionCommand({
			// 		FunctionName: item.functionName,
			// 	})
			// )

			// console.log(result)

			await client.send(
				new UpdateFunctionCodeCommand({
					FunctionName: item.functionName,
					S3Bucket: item.s3.bucket,
					S3Key: item.s3.key,
					S3ObjectVersion: item.s3.version ? item.s3.version : undefined,
					Publish: false,
				})
			)
			// console.log(response)
		})
	)
}
