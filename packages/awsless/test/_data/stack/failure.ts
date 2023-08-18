import { StackConfig } from "../../../src";

export const failureStack: StackConfig = {
	name: 'failure',
	onFailure: __dirname + '/../function/simple.ts'
}
