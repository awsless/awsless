import { dropTable as drop } from '../ddl'
import { AnyTable } from '../table'

export const dropTable = async (table: AnyTable) => {
	await drop(table.client(), table.name)
}
