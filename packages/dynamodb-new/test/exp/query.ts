
import { QueryBulder, build, cursor, flatten } from '../../src/helper/query'
import { IDGenerator } from '../../src/helper/id-generator'
import { AnyTableDefinition } from '../../src/table'
import { users } from '../aws/tables'

describe('Query', () => {

	class First<T extends AnyTableDefinition> extends QueryBulder<T> {
		group() {
			return new Second<T>(this, ['(', cursor, ')'])
		}

		second() {
			return new Second<T>(this, ['second'])
		}
	}

	class Second<T extends AnyTableDefinition> extends QueryBulder<T> {
		first() {
			return new First<T>(this, ['first'])
		}
	}

	it('build query tester', () => {
		const gen = new IDGenerator(users)
		const start = new First()
		const query = start.second().first().group().first().second()

		expect(build(flatten(query), gen)).toBe('second first ( first second )')
	})
})
