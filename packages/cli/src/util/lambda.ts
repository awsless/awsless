import {
	CreateAliasCommand,
	DeleteAliasCommand,
	DeleteFunctionUrlConfigCommand,
	DeleteFunctionEventInvokeConfigCommand,
	GetAliasCommand,
	LambdaClient,
	ListAliasesCommand,
	ListFunctionsCommand,
	ListVersionsByFunctionCommand,
	UpdateAliasCommand,
	UpdateFunctionCodeCommand,
} from '@aws-sdk/client-lambda'
import { Credentials, isError } from './aws'

// ------------------------------------------------------------
// Alias naming contract

export const LIVE_LAMBDA_ALIAS = 'live'

// ------------------------------------------------------------
// Alias plumbing

export const getLambdaAlias = async (lambda: LambdaClient, functionName: string, name: string) => {
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

export const listLambdaFunctions = async (lambda: LambdaClient, prefix: string) => {
	const names: string[] = []
	let marker: string | undefined

	do {
		const result = await lambda.send(
			new ListFunctionsCommand({
				Marker: marker,
			})
		)

		for (const item of result.Functions ?? []) {
			if (item.FunctionName?.startsWith(prefix)) {
				names.push(item.FunctionName)
			}
		}

		marker = result.NextMarker
	} while (marker)

	return names
}

// A deleted function simply has no versions left to prune.
export const listLambdaVersions = async (lambda: LambdaClient, functionName: string) => {
	const versions: string[] = []
	let marker: string | undefined

	try {
		do {
			const result = await lambda.send(
				new ListVersionsByFunctionCommand({
					FunctionName: functionName,
					Marker: marker,
				})
			)

			for (const version of result.Versions ?? []) {
				if (version.Version && version.Version !== '$LATEST') {
					versions.push(version.Version)
				}
			}

			marker = result.NextMarker
		} while (marker)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}

	return versions
}

export const listLambdaAliases = async (lambda: LambdaClient, functionName: string, functionVersion: string) => {
	const aliases = []
	let marker: string | undefined

	do {
		const result = await lambda.send(
			new ListAliasesCommand({
				FunctionName: functionName,
				FunctionVersion: functionVersion,
				Marker: marker,
			})
		)

		aliases.push(...(result.Aliases ?? []))
		marker = result.NextMarker
	} while (marker)

	return aliases
}

// Update-first upsert for aliases that almost always exist (the live alias).
export const upsertLambdaAlias = async (
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

// The alias url & invoke config must be deleted before the alias itself can go.
export const deleteLambdaAlias = async (lambda: LambdaClient, functionName: string, name: string) => {
	try {
		await lambda.send(
			new DeleteFunctionUrlConfigCommand({
				FunctionName: functionName,
				Qualifier: name,
			})
		)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}

	try {
		await lambda.send(
			new DeleteFunctionEventInvokeConfigCommand({
				FunctionName: functionName,
				Qualifier: name,
			})
		)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}

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
