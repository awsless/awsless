import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand,
	UpdateKeysCommand,
	UpdateKeysCommandOutput,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import '@aws-sdk/signature-v4-crt'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import chunk from 'chunk'
import { fromUnixTime, isFuture, isPast } from 'date-fns'
import promiseLimit from 'p-limit'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type ImportKeysInput = {
	kvsArn: Input<string>
	keys: Input<
		Input<{
			key: Input<string>
			value: Input<string>
		}>[]
	>
	ttl?: Input<number>
}

type ImportKeysOutput = {
	kvsArn: Output<string>
	keys: Output<
		{
			key: string
			value: string
		}[]
	>
	ttl: Output<number | undefined>
	oldKeys: Output<
		{
			key: string
			value: string
			ttl: number
		}[]
	>

	eTag: Output<string | undefined>
	itemCount: Output<number>
	totalSizeInBytes: Output<number>
}

export const ImportKeys = createCustomResourceClass<ImportKeysInput, ImportKeysOutput>('cloudfront-kvs', 'import-keys')

type ProviderProps = {
	credentials: Credentials
	region: Region
}

type ConcurrencyQueue = <T>(cb: () => Promise<T>) => Promise<T>

const keySchema = z.object({
	key: z.string(),
	value: z.string(),
})

const oldKeySchema = z.object({
	key: z.string(),
	value: z.string(),
	ttl: z.number(),
})

const stateSchema = z.object({
	kvsArn: z.string(),
	keys: z.array(keySchema).optional().default([]),
	ttl: z.number().optional(),
	oldKeys: z.array(oldKeySchema).optional().default([]),
})

export const createCloudFrontKvsProvider = ({ credentials, region }: ProviderProps) => {
	const client = new CloudFrontKeyValueStoreClient({ credentials, region })
	const queues: Record<string, ConcurrencyQueue> = {}

	const getConcurrencyQueue = (arn: string): ConcurrencyQueue => {
		if (!queues[arn]) {
			queues[arn] = promiseLimit(1)
		}
		return queues[arn]
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
				const state = stateSchema.parse(props.state)

				const result = await client.send(
					new DescribeKeyValueStoreCommand({
						KvsARN: state.kvsArn,
					})
				)

				return {
					...state,
					...formatOutput(result),
				}
			},
			async createResource(props) {
				const state = stateSchema.parse(props.state)

				const result = await bulkUpdate({
					arn: state.kvsArn,
					mutations: state.keys.map(k => ({ type: 'put' as const, key: k.key, value: k.value })),
				})

				return {
					...state,
					oldKeys: [],
					...formatOutput(result),
				}
			},
			async updateResource(props) {
				if (props.priorState.kvsArn !== props.proposedState.kvsArn) {
					throw new Error(`kvsArn can't be changed.`)
				}

				const prior = stateSchema.parse(props.priorState)
				const proposed = stateSchema.parse(props.proposedState)

				// New or changed keys
				const puts = proposed.keys.filter(a => {
					return !prior.keys.find(b => a.key === b.key && a.value === b.value)
				})

				// Keys removed from proposed
				const removed = prior.keys.filter(a => {
					return !proposed.keys.find(b => a.key === b.key)
				})

				// Retire removed keys — retain with TTL if set, delete immediately if not
				const newOldKeys = proposed.ttl
					? removed.map(k => ({ key: k.key, value: k.value, ttl: proposed.ttl! }))
					: []

				const immediateDeletes = proposed.ttl ? [] : removed

				const oldKeys = [...prior.oldKeys, ...newOldKeys]
				const active = oldKeys.filter(k => isFuture(fromUnixTime(k.ttl)))
				const expired = oldKeys.filter(k => isPast(fromUnixTime(k.ttl)))

				// Only delete if not still live somewhere
				const liveKeys = new Set([...proposed.keys.map(k => k.key), ...active.map(k => k.key)])
				const deletes = [...immediateDeletes, ...expired].filter(k => !liveKeys.has(k.key))

				const result = await bulkUpdate({
					arn: proposed.kvsArn,
					mutations: [
						...puts.map(k => ({ type: 'put' as const, key: k.key, value: k.value })),
						...deletes.map(k => ({ type: 'delete' as const, key: k.key })),
					],
				})

				return {
					...proposed,
					oldKeys: active,
					...formatOutput(result),
				}
			},
			async deleteResource(props) {
				const state = stateSchema.parse(props.state)

				const keys = new Set([...state.keys, ...state.oldKeys])

				await bulkUpdate({
					arn: state.kvsArn,
					mutations: Array.from(keys).map(k => ({ type: 'delete', key: k.key })),
				})
			},
		},
	})
}
