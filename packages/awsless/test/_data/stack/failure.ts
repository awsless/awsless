import { StackConfig } from "../../../src/index.js";

export const failureStack: StackConfig = {
	name: 'failure',
	onFailure: __dirname + '/../function/simple.ts'
}
