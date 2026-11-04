import { createTableStatement, float32, int8, number, uint64 } from '../src'

describe('createTableStatement', () => {
	it('writes every clause in order', () => {
		expect(
			createTableStatement('stack--events', {
				columns: { id: 'String', score: { type: 'Float64', default: '0', comment: "it's" } },
				indexes: { id: { expression: 'id', type: 'bloom_filter', granularity: 4 } },
				orderBy: ['id'],
				partitionBy: 'tuple()',
				ttl: 'now() + INTERVAL 1 DAY',
				settings: { index_granularity: 8192 },
				comment: 'events',
			})
		).toBe(
			[
				'CREATE TABLE IF NOT EXISTS `stack--events` (',
				'\t`id` String,',
				"\t`score` Float64 DEFAULT 0 COMMENT 'it\\'s',",
				'\tINDEX `id` id TYPE bloom_filter GRANULARITY 4',
				')',
				'ENGINE = MergeTree',
				'PARTITION BY tuple()',
				'ORDER BY (id)',
				'TTL now() + INTERVAL 1 DAY',
				'SETTINGS index_granularity = 8192',
				"COMMENT 'events'",
			].join('\n')
		)
	})

	it('sorts by nothing without a key', () => {
		expect(createTableStatement('t', { columns: { id: 'String' } })).toContain('ORDER BY tuple()')
	})

	it('names each number type through its own schema', () => {
		expect(float32().type).toBe('Float32')
		expect(int8().type).toBe('Int8')
		expect(uint64().type).toBe('UInt64')
		expect(float32().type).toBe(number('Float32').type)
	})
})
