// import { style } from "../../style.js"
// import { br } from "./basic.js"

import { Box, Text } from "ink";

export const List = ({ data }: { data: Record<string, string> }) => {
	const gap = Math.max(...Object.keys(data).map(key => key.length))
	return (
		<Box flexDirection="column">
			{Object.entries(data).map(([ label, value ]) => (
				<Box key={label} gap={gap + 1 - label.length}>
					<Text bold color='whiteBright'>
						{label}:
					</Text>
					<Text>{value}</Text>
				</Box>
			))}
		</Box>
	)
}

// export const list = (data: Record<string, string>) => {
// 	const padding = 3
// 	const gap = 1
// 	const size = Object.keys(data).reduce((total, name) => {
// 		return name.length > total ? name.length : total
// 	}, 0)

// 	return Object.entries(data).map(([ name, value ]) => [
// 		' '.repeat(padding),
// 		style.label((name+':').padEnd(size + gap + 1)),
// 		value,
// 		br(),
// 	])
// }
