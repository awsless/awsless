// import { mockTask } from '../../../../src/server'
import start from '../start'

describe('test', () => {
	// const task = mockTask(mock => {
	// 	mock.stack.end()
	// })

	it('start', async () => {
		await start()
		// expect(task.stack.end).toBeCalled()
	})
})
