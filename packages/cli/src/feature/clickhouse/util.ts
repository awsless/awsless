import { StackConfig } from '../../config/stack.js'

export const hasClickHouseTables = (stackConfigs: StackConfig[]) => {
	return stackConfigs.some(stack => Object.keys(stack.clickhouse ?? {}).length > 0)
}
