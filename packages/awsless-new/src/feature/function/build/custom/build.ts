// const CustomBuildSchema = z.object({
// 	type: z.literal('custom').describe('Specify how to build the function.'),
// 	cwd: z.string().optional().describe('Specify the current working directory for the build command.'),
// 	command: z.string().describe('Specify the build command.'),
// 	bundleFiles: z.string().describe('Specify files, and or directories that will be bundled.'),
// 	cacheKey: z
// 		.union([LocalFileSchema, LocalDirectorySchema])
// 		.array()
// 		.describe('Specify the source files, and or directories that will be used to generate a cache key.'),
// })

import { exec } from 'promisify-child-process'

type BuildProps = {
	cwd: string
	command: string
}

export const customBuild = async ({ cwd, command }: BuildProps) => {
	console.log(cwd, command)

	await exec(command, { cwd })
}
