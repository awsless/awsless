
import { Terminal } from "../../__ui copy/terminal"
import { togglePrompt } from "./toggle"

export type ConfirmPromptOptions = {
	initial?: boolean
}

export const confirmPrompt = (term: Terminal, label: string, options: ConfirmPromptOptions = {}): Promise<boolean> => {
	return togglePrompt(term, label, {
		...options,
		inactive: 'no',
		active: 'yes',
	})
}
