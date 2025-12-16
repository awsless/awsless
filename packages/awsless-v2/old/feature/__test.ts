// import { z } from 'zod'
// import { definePlugin } from '../plugin.js'
// import { LocalDirectorySchema } from '../config/schema/local-directory.js'

// export const testPlugin = definePlugin({
// 	name: 'test',
// 	schema: z.object({
// 		stacks: z
// 			.object({
// 				/** Define the location of your tests for your stack.
// 				 * @example
// 				 * {
// 				 *   tests: './test'
// 				 * }
// 				 */
// 				tests: z
// 					.union([LocalDirectorySchema.transform(v => [v]), LocalDirectorySchema.array()])
// 					.optional(),
// 			})
// 			.array(),
// 	}),
// 	onStack({ tests, stackConfig }) {
// 		if (stackConfig.tests) {
// 			tests.set(stackConfig.name, stackConfig.tests)
// 		}
// 	},
// })
