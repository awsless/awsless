import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand,
	ListKeysCommand,
	UpdateKeysCommand,
	UpdateKeysCommandOutput,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import chunk from 'chunk'
import promiseLimit from 'p-limit'
import { z } from 'zod'
import { Region } from '../config/schema/region'

import '@aws-sdk/signature-v4-crt'

type ImportKeysInput = {
	kvsArn: Input<string>
	keys: Input<
		Input<{
			key: Input<string>
			value: Input<string>
		}>[]
	>
}

type ImportKeysOutput = {
	kvsArn: Output<string>
	keys: Output<
		{
			key: string
			value: string
		}[]
	>

	eTag: Output<string | undefined>
	itemCount: Output<number>
	totalSizeInBytes: Output<number>
}

export const ImportKeys = createCustomResourceClass<ImportKeysInput, ImportKeysOutput>('cloudfront-kvs', 'import-keys')

type ProviderProps = {
	profile: string
	region: Region
}

type ConcurrencyQueue = <T>(cb: () => Promise<T>) => Promise<T>

export const createCloudFrontKvsProvider = ({ profile, region }: ProviderProps) => {
	const client = new CloudFrontKeyValueStoreClient({ profile, region })
	const queues: Record<string, ConcurrencyQueue> = {}

	const getConcurrencyQueue = (arn: string): ConcurrencyQueue => {
		if (!queues[arn]) {
			const queue = promiseLimit(1)
			queues[arn] = <T>(cb: () => Promise<T>) => {
				return queue(cb)
			}
		}
		return queues[arn]
	}

	const validateInput = (state: unknown) => {
		return z
			.object({
				kvsArn: z.string(),
				keys: z.array(
					z.object({
						key: z.string(),
						value: z.string(),
					})
				),
			})
			.parse(state)
	}

	const formatOutput = (output?: UpdateKeysCommandOutput) => {
		return {
			eTag: output?.ETag,
			itemCount: output?.ItemCount ?? 0,
			totalSizeInBytes: output?.TotalSizeInBytes ?? 0,
		}
	}

	const bulkUpdate = async (props: {
		arn: string
		mutations: Array<
			| {
					type: 'put'
					key: string
					value: string
			  }
			| {
					type: 'delete'
					key: string
			  }
		>
	}): Promise<UpdateKeysCommandOutput | undefined> => {
		const run = async () => {
			const batches = chunk(props.mutations, 50)

			let prev = await client.send(
				new DescribeKeyValueStoreCommand({
					KvsARN: props.arn,
				})
			)

			let result: UpdateKeysCommandOutput | undefined
			let ifMatch = prev.ETag

			for (const mutations of batches) {
				if (mutations.length === 0) {
					continue
				}

				result = await client.send(
					new UpdateKeysCommand({
						KvsARN: props.arn,
						IfMatch: ifMatch,
						Puts: mutations
							.filter(item => item.type === 'put')
							.map(item => ({
								Key: item.key,
								Value: item.value,
							})),
						Deletes: mutations
							.filter(item => item.type === 'delete')
							.map(item => ({
								Key: item.key,
							})),
					})
				)

				ifMatch = result.ETag
			}

			return result
		}

		const queue = getConcurrencyQueue(props.arn)

		return queue(run)
	}

	return createCustomProvider('cloudfront-kvs', {
		'import-keys': {
			async getResource(props) {
				const state = z.object({ kvsArn: z.string() }).parse(props.state)

				const result = await client.send(
					new DescribeKeyValueStoreCommand({
						KvsARN: state.kvsArn,
					})
				)

				const keys: { key: string; value: string }[] = []
				let nextToken: string | undefined

				while (true) {
					const result = await client.send(
						new ListKeysCommand({
							KvsARN: state.kvsArn,
							NextToken: nextToken,
							MaxResults: 50,
						})
					)

					for (const item of result.Items ?? []) {
						keys.push({
							key: item.Key!,
							value: item.Value!,
						})
					}

					if (result.NextToken) {
						nextToken = result.NextToken
					} else {
						break
					}
				}

				return {
					keys,
					...state,
					...formatOutput(result),
				}
			},
			async createResource(props) {
				const state = validateInput(props.state)

				const result = await bulkUpdate({
					arn: state.kvsArn,
					mutations: state.keys.map(item => ({ ...item, type: 'put' })),
				})

				return {
					...state,
					...formatOutput(result),
				}
			},
			async updateResource(props) {
				const priorState = validateInput(props.priorState)
				const proposedState = validateInput(props.proposedState)

				const puts = proposedState.keys.filter(a => {
					return !priorState.keys.find(b => a.key === b.key && a.value === b.value)
				})

				const deletes = priorState.keys.filter(a => {
					return !proposedState.keys.find(b => a.key === b.key)
				})

				const result = await bulkUpdate({
					arn: proposedState.kvsArn,
					mutations: [
						...puts.map(i => ({ ...i, type: 'put' as const })),
						...deletes.map(i => ({ ...i, type: 'delete' as const })),
					],
				})

				return {
					...proposedState,
					...formatOutput(result),
				}
			},
			async deleteResource(props) {
				const state = validateInput(props.state)

				await bulkUpdate({
					arn: state.kvsArn,
					mutations: state.keys.map(i => ({ ...i, type: 'delete' })),
				})
			},
		},
	})
}
