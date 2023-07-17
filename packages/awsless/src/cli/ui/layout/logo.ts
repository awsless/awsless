
import { style } from "../../style"
import { br } from "./basic"

export const logo = () => {
	return [
		style.warning('⚡️ '),
		style.primary('AWS'),
		style.primary.dim('LESS'),
		br(),
	]
}
