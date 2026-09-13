import {
	CreateAliasCommand,
	DeleteAliasCommand,
	DeleteFunctionEventInvokeConfigCommand,
	DeleteFunctionUrlConfigCommand,
	GetAliasCommand,
	LambdaClient,
	ListAliasesCommand,
	ListFunctionsCommand,
	ListVersionsByFunctionCommand,
	UpdateAliasCommand,
} from '@aws-sdk/client-lambda'
import { LIVE_BUNDLE_ALIAS } from 'awsless'
import { isError } from './aws.js'

// The runtime owns the alias name, so both sides can't drift apart.
export const LIVE_LAMBDA_ALIAS = LIVE_BUNDLE_ALIAS

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
