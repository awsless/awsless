import { Config } from "../../../config"
import { list } from "./list"
import { br } from "./basic"
import { logo } from "./logo"

export const header = (config:Config) => {
	return [
		logo(),
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
