import { StackConfig } from "../../../src";
import { cacheStack } from "./cache";
import { tableStack } from "./table";

export const functionStack:StackConfig = {
	name: 'function',
	depends: [ cacheStack, tableStack ],
	functions: {
		call: __dirname + '/../function/call.ts'
	},
}
