import { lang } from '../../../src/framework/svelte.svelte'

export const content = lang.t`Hello ${1} world`

export const fn = () => {
	return lang.t`Right now it's ${new Date()}.`
}

export const foo = {
	bar: lang.t``,
}
