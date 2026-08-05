import { DataSourceMeta } from '../../data-source.ts'
import { createDebugger } from '../../debug.ts'
import { State } from '../../meta.ts'
import { findProvider } from '../../provider.ts'
import { ResourceError } from '../error.ts'
import { NodeState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'

const debug = createDebugger('Data Source')

export const getDataSource = async (
	dataSource: DataSourceMeta,
	input: State,
	opt: WorkSpaceOptions
): Promise<Omit<NodeState, 'dependencies' | 'lifecycle'>> => {
	const provider = findProvider(opt.providers, dataSource.provider)

	debug(dataSource.type)

	if (!provider.getData) {
		throw new Error(`Provider doesn't support data sources`)
	}

	let result

	try {
		result = await provider.getData({
			type: dataSource.type,
			state: input,
		})
	} catch (error) {
		throw ResourceError.wrap(dataSource.urn, dataSource.type, 'get', error)
	}

	return {
		tag: 'data',
		type: dataSource.type,
		provider: dataSource.provider,
		input,
		output: result.state,
	}
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
