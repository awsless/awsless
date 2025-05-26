import { exec } from 'promisify-child-process'

type Props = {
	cwd: string
	command: string
}

export const execCommand = async ({ cwd, command }: Props) => {
	await exec(command, { cwd })

	// console.log('')
	// console.log(output.code)
	// console.log(output.stderr)
	// console.log('')
}
