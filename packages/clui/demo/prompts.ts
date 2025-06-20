import { color, log, prompt } from '../src/index'

log.intro('intro')

const user = await prompt.text({ message: color.blue('Username') })
const pass = await prompt.password({ message: 'Password' })
const amount = await prompt.float({ message: 'Amount' })
const code = await prompt.integer({ message: 'Code' })
const conf = await prompt.confirm({ message: 'Are you sure?' })
const type = await prompt.select({
	message: 'Pick user type',
	initialValue: 1,
	options: [
		{ value: 1, label: color.blue('User') },
		{ value: 2, label: 'Admin' },
		{ value: 3, label: 'Support' },
	],
})

const multi = await prompt.multiSelect({
	message: 'Tags',
	initialValues: ['apple'],
	options: [{ value: 'apple' }, { value: 'banana' }, { value: 'berry' }],
})

log.table({
	head: ['Prompt', 'Value'],
	body: [
		['Username', user],
		['Password', pass],
		['Amount', amount],
		['Code', code],
		['Are you sure?', conf],
		['Type', type],
		['Tags', multi.join(', ')],
	],
})

log.outro('outro')

process.exit()
