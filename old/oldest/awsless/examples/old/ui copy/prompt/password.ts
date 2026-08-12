import { Terminal } from "../../__ui copy/terminal"
import { TextPromptOptions, textPrompt } from "./text"

export type PasswordPromptOptions = Omit<TextPromptOptions, 'renderer'>

export const passwordPrompt = (term: Terminal, label: string, options: PasswordPromptOptions = {}): Promise<string> => {
	return textPrompt(term, label, {
		...options,
		renderer(value) {
			return '*'.repeat(value.length)
		}
	})
}
