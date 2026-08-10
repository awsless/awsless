import { seed, t } from 'awsless'
import { tasks } from './src/table'

// Deterministic ids make the seed an upsert: reseeding never
// duplicates data.
await t.putItems(tasks, [
	{ id: seed.uuid('task-milk'), name: 'Buy milk', done: false },
	{ id: seed.uuid('task-ship'), name: 'Ship awsless', done: true },
	{ id: seed.uuid('task-seed'), name: 'Seed the local dev env', done: false },
])
