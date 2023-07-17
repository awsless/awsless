
import { Fragment } from "../terminal"
import { br } from "./basic"
import { logs } from "./logs"

export const footer = (): Fragment => {
	return [
		br(),
		logs(),
	]
}
