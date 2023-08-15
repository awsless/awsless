
const strToInt = (str: string) => {
	return parseInt(Buffer.from(str, 'utf8').toString('hex'), 16)
}

export const generatePriority = (stackName: string, route: string) => {
	const start = strToInt(stackName) % 500 + 1
	const end = strToInt(route) % 100
	const priority = start + '' + end

	return parseInt(priority, 10)
}
