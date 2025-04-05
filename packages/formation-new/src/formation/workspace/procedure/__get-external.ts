import { DataSourceMeta } from '../../data-source.ts'
import { createDebugger } from '../../debug.ts'
import { findProvider } from '../../provider.ts'
import { ResourceError } from '../error.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Data Source')

export const getDataSource = async (dataSource: DataSourceMeta, opt: WorkSpaceOptions) => {
	const provider = findProvider(opt.providers, dataSource.$.provider)

	debug(dataSource.$.type)

	let result

	try {
		result = await provider.getResource({
			type: dataSource.$.type,
			state: {
				id: dataSource.$.physicalId,
			},
		})
	} catch (error) {
		throw ResourceError.wrap(dataSource.$.urn, dataSource.$.type, 'get', error)
	}

	return result.state
}

// private async getRemoteResource(props: {
// 	urn: URN;
// 	type: string;
// 	id: string;
// 	document: ResourceDocument;
// 	// assets: Record<string, ResolvedAsset>
// 	extra: ResourceDocument;
// 	provider: CloudProvider;
//   }) {
// 	let remote: any;
// 	try {
// 	  remote = await props.provider.get(props);
// 	} catch (error) {
// 	  throw ResourceError.wrap(props.urn, props.type, props.id, "get", error);
// 	}

// 	return remote;
//   }
