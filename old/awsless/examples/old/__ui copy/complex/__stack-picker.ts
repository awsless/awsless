// import { StackNode, flattenDeploymentTree } from "../../../util/deployment";
// import { debug } from "../../logger";
// import { style, symbol } from "../../style";
// import { Signal, Terminal } from "../../terminal";
// import { br } from "../layout/basic";

// export const stackPicker = (term:Terminal, label:string, stacks:StackNode[]) => {
// 	return new Promise(resolve => {
// 		const selected: string[] = []
// 		const flatStacks = flattenDeploymentTree(stacks)
// 		const size = flatStacks.length - 1

// 		const cursor = new Signal<number>(0)

// 		const icon = new Signal<string>(style.info(symbol.question))
// 		const sep = new Signal<string>(style.placeholder.dim(symbol.pointerSmall))

// 		const release = term.captureInput({
// 			// submit: () => {
// 			// 	release()
// 			// },
// 			input(key) {
// 				if(key === ' ') {
// 					controls[cursor.get()].checked.update((checked) => Number(!checked))
// 				}
// 			},
// 			up() {
// 				cursor.update((cursor) => --cursor < 0 ? size : cursor)
// 			},
// 			down() {
// 				cursor.update((cursor) => ++cursor > size ? 0 : cursor)
// 			},
// 			left() {
// 				controls[cursor.get()].checked.set(0)
// 			},
// 			right() {
// 				controls[cursor.get()].checked.set(1)
// 			}
// 		})

// 		term.write`${icon}  ${style.label(label)} ${sep}`
// 		term.write(br())
// 		term.write(br())

// 		// debug(flatStacks)

// 		const controls = flatStacks.map((stack, index) => {
// 			const checked = new Signal<number>(0)
// 			const radio = checked.derive<string>((checked) => {
// 				return checked ? symbol.radioOn : symbol.radioOff
// 			})
// 			// const label = new Signal<string>(stack.artifactId)
// 			const label = cursor.derive<string>((cursor) => {
// 				const name = stack.artifactId
// 				return cursor === index ? style.success.underline(name) : name
// 			})
// 			term.write`${radio} ${label}`
// 			term.write('  ')

// 			return {
// 				checked,
// 				radio,
// 				label,
// 			}
// 		})
// 	})
// }
