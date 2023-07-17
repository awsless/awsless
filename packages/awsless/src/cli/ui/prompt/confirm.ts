
import { togglePrompt } from "./toggle"

export type ConfirmPromptOptions = {
	initial?: boolean
}

export const confirmPrompt = (label: string, options: ConfirmPromptOptions = {}) => {
	return togglePrompt(label, {
		...options,
		inactive: 'no',
		active: 'yes',
	})
}
