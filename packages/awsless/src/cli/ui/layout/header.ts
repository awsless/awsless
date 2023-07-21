import { Config } from "../../../config.js"
import { list } from "./list.js"
import { br } from "./basic.js"
// import { logo } from "./logo.js"

export const header = (config:Config) => {
	return [
		br(),
		list({
			App: config.name,
			Stage: config.stage,
			Region: config.region,
			Profile: config.profile,
		}),
		br(),
	]
}
