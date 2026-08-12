
import { style } from "../../../../src/cli/style"
import { br } from "./basic"

export const logo = () => {
	return [
		style.warning('⚡️ '),
		style.primary('AWS'),
		style.primary.dim('LESS'),
		br(),
	]
}
