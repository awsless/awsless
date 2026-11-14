// A test file's Postgres schemas are made the first time it queries them:
// most files never do, and a table with partitions takes a while to make.

type TestSchema = {
	create: () => Promise<void>
	created?: Promise<void>
}

const schemas = new Map<string, TestSchema>()

export const deferTestSchema = (schema: string, create: () => Promise<void>) => {
	schemas.set(schema, { create })
}

// Resolves once the schema is there. Every query of the file waits for
// the one creation, and fails with its error when it failed.
export const ensureTestSchema = (schema: string) => {
	const entry = schemas.get(schema)

	if (entry) {
		entry.created ??= entry.create()
	}

	return entry?.created
}
