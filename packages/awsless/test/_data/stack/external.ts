import { StackConfig } from "../../../src";

export const externalStack: StackConfig = {
	name: 'external',
	functions: {
		bet: __dirname + '/../function.ts'
	},
}
