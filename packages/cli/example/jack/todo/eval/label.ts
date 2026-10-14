import { type Label, labelTask } from '../src/lib/label'

const cases: { name: string; expect: Label }[] = [
	{ name: 'Prepare the quarterly report', expect: 'work' },
	{ name: 'Team meeting at 10', expect: 'work' },
	{ name: 'Deploy the new release', expect: 'work' },
	{ name: 'Go to the gym', expect: 'health' },
	{ name: 'Book a dentist appointment', expect: 'health' },
	{ name: 'Water the plants', expect: 'home' },
	{ name: 'Clean the kitchen', expect: 'home' },
	// The fake model misses this one, the stack threshold still lets the run pass.
	{ name: 'Morning jog in the park', expect: 'health' },
]

describe('Task labels', () => {
	it.for(cases)('$name', async ({ name, expect: expected }, { expect }) => {
		expect(await labelTask(name)).toBe(expected)
	})
})
