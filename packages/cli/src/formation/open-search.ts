import { fromTemporaryCredentials } from '@aws-sdk/credential-providers'
import { Client } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type SearchIndexInput = {
	endpoint: Input<string>
	role?: Input<string> | undefined
	index: Input<string>
	mappings: Input<string>
	settings: Input<string>
}

type SearchIndexOutput = {
	endpoint: Output<string>
	index: Output<string>
	mappings: Output<string>
	settings: Output<string>
}

// Manages an index inside an OpenSearch domain, like a table: the
// deploy creates missing indexes & applies the mappings over the
// domain rest api.
export const SearchIndex = createCustomResourceClass<SearchIndexInput, SearchIndexOutput>('open-search', 'index')

type ProviderProps = {
	credentials: Credentials
	region: Region
}

const inputSchema = z.object({
	endpoint: z.string(),
	role: z.string().optional(),
	index: z.string(),
	mappings: z.string(),
	settings: z.string(),
})

// Creating the index when it's missing & always putting the mappings
// mirrors how table deploys behave: additive mapping changes apply,
// breaking ones fail the deploy with the OpenSearch error.
export const applySearchIndex = async (
	client: Client,
	props: { index: string; mappings?: Record<string, unknown>; settings?: Record<string, unknown> }
) => {
	const mappings = props.mappings ?? {}
	const settings = props.settings ?? {}
	const exists = await client.indices.exists({ index: props.index })

	if (!exists.body) {
		await client.indices.create({
			index: props.index,
			body: {
				...(Object.keys(settings).length > 0 ? { settings } : {}),
				...(Object.keys(mappings).length > 0 ? { mappings } : {}),
			},
		})

		return
	}

	if (Object.keys(mappings).length > 0) {
		await client.indices.putMapping({
			index: props.index,
			body: mappings,
		})
	}
}

export const createOpenSearchProvider = ({ credentials, region }: ProviderProps) => {
	const getClient = (endpoint: string, role?: string) => {
		return new Client({
			node: URL.canParse(endpoint) ? endpoint : `https://${endpoint}`,
			...AwsSigv4Signer({
				region,
				service: endpoint.includes('.aoss.') ? 'aoss' : 'es',
				// Serverless collection endpoints need aoss signing, & data access goes through the search access role.
				getCredentials: role
					? fromTemporaryCredentials({
							params: { RoleArn: role, RoleSessionName: 'awsless-search-index' },
							masterCredentials: credentials,
						})
					: credentials,
			}),
		})
	}

	const apply = async (state: unknown) => {
		const props = inputSchema.parse(state)

		await applySearchIndex(getClient(props.endpoint, props.role), {
			index: props.index,
			mappings: JSON.parse(props.mappings),
			settings: JSON.parse(props.settings),
		})

		return props
	}

	return createCustomProvider('open-search', {
		index: {
			async createResource(props) {
				return apply(props.state)
			},
			async updateResource(props) {
				return apply(props.proposedState)
			},
			// An index can't move to another domain in place, so an endpoint
			// or name change replaces it - drop on the old domain, recreate
			// on the new one. Mapping & settings changes stay updates.
			async planResourceChange(props) {
				const prior = props.priorState as { endpoint?: string; index?: string } | null
				const proposed = props.proposedState as { endpoint?: string; index?: string } | null

				return {
					state: props.proposedState,
					requiresReplacement:
						!!prior && (prior.endpoint !== proposed?.endpoint || prior.index !== proposed?.index),
				}
			},
			// Removing the resource drops the index & its data. The app's
			// retain removal policy skips this through the resource's
			// retainOnDelete flag, like the domain itself.
			async deleteResource(props) {
				const state = inputSchema.parse(props.state)

				await getClient(state.endpoint, state.role).indices.delete({ index: state.index }, { ignore: [404] })
			},
		},
	})
}
