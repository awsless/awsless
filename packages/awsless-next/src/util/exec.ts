import { exec } from 'promisify-child-process'

type Props = {
	cwd: string
	command: string
	env?: NodeJS.ProcessEnv
}

export const execCommand = async ({ cwd, env, command }: Props) => {
	await exec(command, { cwd, env })

	// console.log('')
	// console.log(output.code)
	// console.log(output.stderr)
	// console.log('')
}
