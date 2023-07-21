
import { Box } from "ink"
import { Logo } from "./logo.js"
import { Config } from "../../../config.js"
import { List } from "./list.js"

export const Header = ({ config }: { config: Config }) => (
	<Box flexDirection="column" gap={1}>
		<Logo />
		<Box paddingLeft={2}>
			<List data={{
				App: config.name,
				Stage: config.stage,
				Region: config.region,
				Profile: config.profile,
			}} />
		</Box>
	</Box>
)

// import { Config } from "../../../config.js"
// import { list } from "./list.js"
// import { br } from "./basic.js"
// import { logo } from "./logo.js"

// export const header = (config:Config) => {
// 	return [
// 		logo(),
// 		br(),
// 		list({
// 			App: config.name,
// 			Stage: config.stage,
// 			Region: config.region,
// 			Profile: config.profile,
// 		}),
// 		br(),
// 	]
// }
