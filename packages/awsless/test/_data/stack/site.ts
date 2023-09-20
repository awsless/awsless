import { defineStackConfig } from "../../../src";

export const siteStack = defineStackConfig({
	name: 'site',

	sites: {
		news: {
			domain: 'getblockalert.com',
			public: __dirname + '/../public',
			ssr: __dirname + '/../function/ssr.ts',
		}
	},
	commands: {
		build: [
			'pnpm run build --prod'
		]
	}
})
