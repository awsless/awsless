import { Fn, Task } from 'awsless'

export default async () => {
	const allowed = await Fn.stack.function({ from: 'sandboxed' })

	await Task.stack.work({ from: 'sandboxed' })

	let blocked = 'not blocked'

	try {
		await Fn.stack.caller({})
	} catch (error) {
		blocked = (error as Error).message
	}

	return {
		allowed,
		task: 'sent',
		blocked,
		proxy: process.env.SANDBOX_PROXY,
	}
}
