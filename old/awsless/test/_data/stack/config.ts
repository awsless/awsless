import { StackConfig } from "../../../src/index.js";

export const configStack:StackConfig = {
	name: 'config',
	configs: [ 'test' ],
	functions: {
		config: __dirname + '/../function/config.ts',
	},
}
