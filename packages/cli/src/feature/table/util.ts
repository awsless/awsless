import { StackConfig } from '../../config/stack.js'

type TableProps = NonNullable<StackConfig['tables']>[string]

// The runtime table keys derived from the stack config, injected as a
// TABLE_<STACK>_<ID>_KEYS env - app code defines tables with only a
// schema & the keys stay single sourced in the stack file.
export const formatTableKeys = (props: TableProps) => {
	return {
		hash: props.hash,
		...(props.sort ? { sort: props.sort } : {}),
		...(props.indexes && Object.keys(props.indexes).length > 0
			? {
					indexes: Object.fromEntries(
						Object.entries(props.indexes).map(([name, index]) => [
							name,
							{
								hash: index.hash,
								...(index.sort ? { sort: index.sort } : {}),
							},
						])
					),
				}
			: {}),
	}
}
