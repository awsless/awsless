import { alterTableStatements, TableChangeError, type TableDefinition } from '../src'

const links: TableDefinition = {
	columns: {
		id: { type: 'bigint', identity: true },
		project_id: 'uuid',
		external_id: { type: 'text', collate: 'C' },
		happened_at: 'timestamptz?',
		event_days: { type: 'datemultirange', default: "'{}'" },
		weight: 'double precision?',
	},
	primaryKey: ['project_id', 'external_id'],
	indexes: {
		happened: ['project_id', 'happened_at'],
		id: { columns: ['project_id', 'id'], unique: true },
	},
	fillfactor: 85,
}

const partitioned: TableDefinition = { ...links, partitionBy: { hash: ['project_id'], partitions: 4 } }

// The next definition with some of its parts replaced.
const change = (props: Partial<TableDefinition>, from = links): TableDefinition => ({ ...from, ...props })

const columns = (props: TableDefinition['columns']) => change({ columns: { ...links.columns, ...props } })

// Every change rewrites the comment last, so that's left out where a test is about something else.
const statements = (next: TableDefinition, prior = links) => {
	const all = alterTableStatements('links', prior, next)

	expect(all.at(-1)).toMatch(/^COMMENT ON TABLE "links" IS 'awsless:/)

	return all.slice(0, -1)
}

describe('alterTableStatements', () => {
	it('has nothing to do for the same definition, however it is written', () => {
		expect(alterTableStatements('links', links, links)).toEqual([])
		expect(alterTableStatements('links', partitioned, partitioned)).toEqual([])

		// The long form of a column & an index mean what the short form does.
		expect(
			alterTableStatements(
				'links',
				links,
				change({
					columns: {
						...links.columns,
						project_id: { type: 'uuid' },
						weight: { type: ' double precision ?' },
					},
					indexes: { ...links.indexes, happened: { columns: ['project_id', 'happened_at'], unique: false } },
				})
			)
		).toEqual([])
	})

	it('only rewrites the comment for a type spelled another way', () => {
		expect(statements(columns({ weight: 'Double  Precision?' }))).toEqual([])
	})

	it('stores the definition it was made from in the comment', () => {
		const comment = alterTableStatements('links', links, columns({ note: 'text?' })).at(-1)!
		const stored = JSON.parse(comment.slice(comment.indexOf('awsless:') + 8, -1).replaceAll("''", "'"))

		expect(stored.columns.note).toEqual({ type: 'text', nullable: true, identity: false })
		expect(stored.columns.event_days).toEqual({
			type: 'datemultirange',
			nullable: false,
			default: "'{}'",
			identity: false,
		})
		expect(stored.indexes.happened).toEqual({ columns: ['project_id', 'happened_at'], unique: false })
		expect(stored.primaryKey).toEqual(['project_id', 'external_id'])
		expect(stored.fillfactor).toBe(85)
	})

	it('adds a column', () => {
		expect(statements(columns({ note: 'text?' }))).toEqual(['ALTER TABLE "links" ADD COLUMN "note" text'])
		expect(statements(columns({ count: { type: 'integer', default: '0' } }))).toEqual([
			'ALTER TABLE "links" ADD COLUMN "count" integer DEFAULT 0 NOT NULL',
		])
		expect(statements(columns({ key: { type: 'text', collate: 'C' } }))).toEqual([
			'ALTER TABLE "links" ADD COLUMN "key" text COLLATE "C" NOT NULL',
		])
		expect(statements(columns({ seq: { type: 'bigint', identity: true } }))).toEqual([
			'ALTER TABLE "links" ADD COLUMN "seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL',
		])
	})

	it('drops a column', () => {
		const { weight: _, ...rest } = links.columns

		expect(statements(change({ columns: rest }))).toEqual(['ALTER TABLE "links" DROP COLUMN "weight"'])
	})

	it('changes a default', () => {
		expect(statements(columns({ weight: { type: 'double precision?', default: '1' } }))).toEqual([
			'ALTER TABLE "links" ALTER COLUMN "weight" SET DEFAULT 1',
		])
		expect(
			statements(columns({ event_days: { type: 'datemultirange', default: "'{[2026-01-01,2026-01-02)}'" } }))
		).toEqual([`ALTER TABLE "links" ALTER COLUMN "event_days" SET DEFAULT '{[2026-01-01,2026-01-02)}'`])
		expect(statements(columns({ event_days: 'datemultirange' }))).toEqual([
			'ALTER TABLE "links" ALTER COLUMN "event_days" DROP DEFAULT',
		])
	})

	it('makes a column nullable or NOT NULL', () => {
		expect(statements(columns({ project_id: 'uuid?' }))).toEqual([
			'ALTER TABLE "links" ALTER COLUMN "project_id" DROP NOT NULL',
		])
		expect(statements(columns({ happened_at: 'timestamptz' }))).toEqual([
			'ALTER TABLE "links" ALTER COLUMN "happened_at" SET NOT NULL',
		])
	})

	it('adds, drops & replaces indexes under the name of their table', () => {
		expect(statements(change({ indexes: { ...links.indexes, weight: ['weight'] } }))).toEqual([
			'CREATE INDEX "links_weight" ON "links" ("weight")',
		])
		expect(statements(change({ indexes: { id: links.indexes!.id! } }))).toEqual([
			'DROP INDEX IF EXISTS "links_happened"',
		])
		expect(statements(change({ indexes: undefined }))).toEqual([
			'DROP INDEX IF EXISTS "links_happened"',
			'DROP INDEX IF EXISTS "links_id"',
		])
		// Other columns or another kind make it another index.
		expect(statements(change({ indexes: { ...links.indexes, happened: ['happened_at', 'project_id'] } }))).toEqual([
			'DROP INDEX IF EXISTS "links_happened"',
			'CREATE INDEX "links_happened" ON "links" ("happened_at", "project_id")',
		])
		expect(
			statements(
				change({
					indexes: { ...links.indexes, happened: { columns: ['project_id', 'happened_at'], unique: true } },
				})
			)
		).toEqual([
			'DROP INDEX IF EXISTS "links_happened"',
			'CREATE UNIQUE INDEX "links_happened" ON "links" ("project_id", "happened_at")',
		])
	})

	it('drops an index before the column it holds & creates one after its column', () => {
		const { happened_at: _, ...rest } = links.columns

		expect(
			statements(
				change({
					columns: { ...rest, seen_at: 'timestamptz?' },
					indexes: { id: links.indexes!.id!, seen: ['project_id', 'seen_at'] },
				})
			)
		).toEqual([
			'DROP INDEX IF EXISTS "links_happened"',
			'ALTER TABLE "links" DROP COLUMN "happened_at"',
			'ALTER TABLE "links" ADD COLUMN "seen_at" timestamptz',
			'CREATE INDEX "links_seen" ON "links" ("project_id", "seen_at")',
		])
	})

	it('changes the fillfactor, of every partition for a partitioned table', () => {
		expect(statements(change({ fillfactor: 70 }))).toEqual(['ALTER TABLE "links" SET (fillfactor = 70)'])
		expect(statements(change({ fillfactor: undefined }))).toEqual(['ALTER TABLE "links" RESET (fillfactor)'])
		expect(statements(change({ fillfactor: 70 }, partitioned), partitioned)).toEqual([
			'ALTER TABLE "links_p0" SET (fillfactor = 70)',
			'ALTER TABLE "links_p1" SET (fillfactor = 70)',
			'ALTER TABLE "links_p2" SET (fillfactor = 70)',
			'ALTER TABLE "links_p3" SET (fillfactor = 70)',
		])
	})

	const refused = (next: TableDefinition, prior = links) => {
		try {
			alterTableStatements('links', prior, next)
		} catch (error) {
			expect(error).toBeInstanceOf(TableChangeError)

			return (error as Error).message
		}

		throw new Error('The change was not refused.')
	}

	it('refuses another primary key', () => {
		const message =
			'The primary key of Postgres table "links" can\'t change in place. Declare a new table & copy the data over instead.'

		expect(refused(change({ primaryKey: ['project_id', 'external_id', 'id'] }))).toBe(message)
		expect(refused(change({ primaryKey: ['external_id', 'project_id'] }))).toBe(message)
	})

	it('refuses another type, collation or identity of a column', () => {
		expect(refused(columns({ external_id: { type: 'uuid', collate: 'C' } }))).toContain(
			'The type of column "external_id" (text to uuid) of Postgres table "links" can\'t change in place.'
		)
		expect(refused(columns({ id: { type: 'integer', identity: true } }))).toContain(
			'type of column "id" (bigint to integer)'
		)
		expect(refused(columns({ external_id: 'text' }))).toContain(
			'The collation of column "external_id" of Postgres table "links"'
		)
		expect(refused(columns({ external_id: { type: 'text', collate: 'und-x-icu' } }))).toContain(
			'collation of column "external_id"'
		)
		expect(refused(columns({ project_id: { type: 'uuid', collate: 'C' } }))).toContain(
			'collation of column "project_id"'
		)
		expect(refused(columns({ id: 'bigint' }))).toContain('The identity of column "id" of Postgres table "links"')
		expect(refused(columns({ project_id: { type: 'uuid', identity: true } }))).toContain(
			'identity of column "project_id"'
		)
	})

	it('refuses other partitioning: its columns, its count, or having it at all', () => {
		const message =
			'The partitioning of Postgres table "links" can\'t change in place. Declare a new table & copy the data over instead.'

		expect(
			refused(change({ partitionBy: { hash: ['project_id'], partitions: 8 } }, partitioned), partitioned)
		).toBe(message)
		expect(
			refused(
				change({ partitionBy: { hash: ['project_id', 'external_id'], partitions: 4 } }, partitioned),
				partitioned
			)
		).toBe(message)
		expect(refused(partitioned, links)).toBe(message)
		expect(refused(links, partitioned)).toBe(message)
	})

	it('refuses before it plans anything else', () => {
		expect(
			refused(
				change({ primaryKey: ['project_id'], fillfactor: 70, columns: { ...links.columns, note: 'text?' } })
			)
		).toContain('primary key')
	})

	it('only takes names it can write into sql as they are', () => {
		expect(() => alterTableStatements('links', links, columns({ 'bad-name': 'text?' }))).toThrow(TypeError)
		expect(() => alterTableStatements('Links', links, change({ fillfactor: 70 }))).toThrow(TypeError)
	})
})
