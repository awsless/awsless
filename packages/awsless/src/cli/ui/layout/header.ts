import { Config } from "../../../config.js"
import { list } from "./list.js"

export const header = (config:Config) => {
	return list({
		App: config.name,
		Stage: config.stage,
		Region: config.region,
		Profile: config.profile,
	})
}
