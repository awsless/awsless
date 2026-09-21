import type { Component, Snippet } from 'svelte'

/** Marks markup for translation. The i18n Vite plugin translates the text
 * between the tags, markup included, and rewrites the component during
 * the build. Without the plugin it renders its children as is.
 *
 * @example
 * <T>Hello <b>{user.name}</b>, you have {count} new messages.</T>
 */
declare const T: Component<{
	children?: Snippet
	/** A hint for the translator about where the text is used, for
	 * example "button label" or "the verb". Dropped during the build. */
	context?: string
}>

export default T
