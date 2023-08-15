
import { togglePrompt } from "./toggle.js"

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
