import { Client } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type SearchIndexInput = {
	endpoint: Input<string>
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
	const getClient = (endpoint: string) => {
		return new Client({
			node: `https://${endpoint}`,
			...AwsSigv4Signer({
				region,
				service: 'es',
				getCredentials: credentials,
			}),
		})
	}

	const apply = async (state: unknown) => {
		const props = inputSchema.parse(state)

		await applySearchIndex(getClient(props.endpoint), {
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
			// Removing the resource drops the index & its data. The app's
			// retain removal policy skips this through the resource's
			// retainOnDelete flag, like the domain itself.
			async deleteResource(props) {
				const state = inputSchema.parse(props.state)

				await getClient(state.endpoint).indices.delete(
					{ index: state.index },
					// An already missing index (or a manually deleted
					// domain) shouldn't fail the removal.
					{ ignore: [404] }
				)
			},
		},
	})
}
