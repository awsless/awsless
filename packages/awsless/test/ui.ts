
// import { render } from "solid-ink"
// import { renderConfigUi } from "../src/cli/ui/config.jsx"

import { Signal, Terminal } from "../src/cli/__terminal"

describe('UI', () => {

	it('config', async () => {

		const name = 'Jack'
		const counter = new Signal<number>(0)
		const terminal = new Terminal()

		terminal.clear()
		terminal.line`Name: ${name}`
		terminal.line`Counter: ${counter}`

		setTimeout(() => counter.set(counter.get() + 1), 1000)

	})

})
