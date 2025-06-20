import {
	ConfirmOptions,
	MultiSelectOptions,
	confirm as p_confirm,
	multiselect as p_multiselect,
	password as p_password,
	select as p_select,
	text as p_text,
	PasswordOptions,
	SelectOptions,
	TextOptions,
} from '@clack/prompts'
import { wrapPrompt } from './error'

export const text = async (opts: TextOptions) => {
	return wrapPrompt(() => {
		return p_text(opts)
	})
}

export const password = async (opts: PasswordOptions) => {
	return wrapPrompt(() => {
		return p_password({ mask: '*', ...opts })
	})
}

type NumberOptions = {
	message: string
	placeholder?: string
	defaultValue?: number
	initialValue?: number
}

export const integer = async (opts: NumberOptions) => {
	const result = await text({
		...opts,
		defaultValue: opts.defaultValue?.toString(),
		initialValue: opts.initialValue?.toString(),
		validate(value) {
			if (isNaN(Number(value)) || isNaN(parseInt(value, 10)) || value.includes('.')) {
				return 'Invalid integer'
			}

			return
		},
	})

	return parseInt(result, 10)
}

export const float = async (opts: NumberOptions) => {
	const result = await text({
		...opts,
		defaultValue: opts.defaultValue?.toString(),
		initialValue: opts.initialValue?.toString(),
		validate(value) {
			if (isNaN(Number(value)) || isNaN(parseFloat(value))) {
				return 'Invalid float'
			}

			return
		},
	})

	return parseFloat(result)
}

export const confirm = async (opts: ConfirmOptions) => {
	return wrapPrompt(() => {
		return p_confirm(opts)
	})
}

export const select = async <Value>(opts: SelectOptions<Value>) => {
	return wrapPrompt(() => {
		return p_select(opts)
	})
}

export const multiSelect = async <Value>(opts: MultiSelectOptions<Value>) => {
	return wrapPrompt(() => {
		return p_multiselect(opts)
	})
}
