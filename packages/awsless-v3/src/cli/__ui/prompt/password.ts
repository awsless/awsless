import { TextPromptOptions, textPrompt } from './text.js'

export type PasswordPromptOptions = Omit<TextPromptOptions, 'renderer'>

export const passwordPrompt = (label: string, options: PasswordPromptOptions = {}) => {
	return textPrompt(label, {
		...options,
		renderer(value) {
			return value.map(() => '*')
		},
	})
}
