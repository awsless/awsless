import { RenderFactory } from '../../__lib/renderer.js'
import { Signal, derive } from '../../__lib/signal.js'
import { style, symbol } from '../../ui/style.js'
import { br } from '../layout/basic.js'

export type TextPromptOptions = {
	// defaultValue?: string
	// placeholder?: string
	// validate?: (value: string) => boolean | string
	renderer?: (value: string[]) => string[]
}

export const textPrompt = (label: string, options: TextPromptOptions = {}): RenderFactory<Promise<string>> => {
	return term => {
		return new Promise(resolve => {
			const done = new Signal(false)
			const cursor = new Signal(0)
			const icon = new Signal(style.info(symbol.question))
			const value = new Signal<string[]>([])
			const custom = derive([value], options.renderer ?? (value => value))
			const formatted = derive([custom, cursor, done] as const, (value, cursor, done) => {
				if (done) {
					return value.join('')
				}

				return [...value, ' ']
					.map((chr, i) => {
						return i === cursor ? style.cursor(chr) : chr
					})
					.join('')
			})

			const sep = new Signal(style.placeholder(symbol.pointerSmall))

			const release = term.in.captureInput({
				reset() {
					value.set([])
					cursor.set(0)
				},
				exit() {
					release()
					done.set(true)
					icon.set(style.success(symbol.success))
					sep.set(symbol.ellipsis)
					value.set([])

					resolve('')
				},
				submit() {
					release()
					done.set(true)
					icon.set(style.success(symbol.success))
					sep.set(symbol.ellipsis)

					resolve(value.get().join(''))
				},
				input: chr => {
					value.update(value => [...value.slice(0, cursor.get()), chr, ...value.slice(cursor.get())])
					cursor.update(cursor => cursor + 1)
				},
				delete() {
					value.update(value => [...value].filter((_, i) => i !== cursor.get() - 1))
					cursor.update(cursor => Math.max(0, cursor - 1))
				},
				left() {
					cursor.update(cursor => Math.max(0, cursor - 1))
				},
				right() {
					cursor.update(cursor => Math.min(value.get().length, cursor + 1))
				},
			})

			term.out.write([icon, ' ', style.label(label), ' ', sep, ' ', formatted, br()])
		})
	}
}
