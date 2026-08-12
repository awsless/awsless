import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'

export default async (payload: { message: string }) => {
	const counterFile = '/root/.job-counter'
	const taskId = process.env.ECS_TASK_ARN?.split('/').pop() ?? 'unknown'

	let count = 0
	if (existsSync(counterFile)) {
		count = parseInt(await readFile(counterFile, 'utf8')) || 0
	}
	count++
	await writeFile(counterFile, count.toString())

	console.log(`Task ${taskId}: Run #${count}, payload: ${payload.message}`)
	console.log(`Persistent storage at /root works: counter persisted across ${count} run(s)`)
}
