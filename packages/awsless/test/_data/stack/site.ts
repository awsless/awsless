import { defineStackConfig } from "../../../src/index.js";

export const siteStack = defineStackConfig({
	name: 'site',

	sites: {
		news: {
			domain: 'getblockalert.com',
			static: __dirname + '/../public',
			ssr: {
				file: __dirname + '/../function/ssr.ts',
				log: '1 day',
			}
		}
	},
	// commands: {
	// 	build: [
	// 		'pnpm run build --prod'
	// 	]
	// }
})
