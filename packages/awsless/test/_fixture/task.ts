import { task } from '../../src/lib/handle/func'

export const runs: unknown[] = []

export default task((event: unknown) => {
	runs.push(event)
})
