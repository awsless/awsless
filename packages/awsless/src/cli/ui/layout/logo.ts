
import { style } from "../../style.js"
import { br } from "./basic.js"

export const logo = () => {
	return [
		style.warning('⚡️ '),
		style.primary('AWS'),
		style.primary.dim('LESS'),
		br(),
	]
}
