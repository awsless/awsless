// A test file's Postgres database is made the first time the file queries
// it: most files never do, and a table with partitions takes a while to make.

type TestDatabase = {
	create: () => Promise<void>
	created?: Promise<void>
}

const databases = new Map<string, TestDatabase>()

export const deferTestDatabase = (database: string, create: () => Promise<void>) => {
	databases.set(database, { create })
}

// Resolves once the database is there. Every query of the file waits for
// the one creation, and fails with its error when it failed.
export const ensureTestDatabase = (database: string) => {
	const entry = databases.get(database)

	if (entry) {
		entry.created ??= entry.create()
	}

	return entry?.created
}
